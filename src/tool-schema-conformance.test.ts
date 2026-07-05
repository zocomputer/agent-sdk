import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { createSandboxFileTools, createStdlib } from "./index";
import { buildTasksToolset } from "./tools/tasks";

// Model-facing schema shape is a contract (design/foundation/03, extended by
// rib/learnings/35): newer Anthropic models garble off-prior tool shapes —
// invented trailing keys inside nested arrays of objects — and Zod's default
// strip mode absorbing unknown keys is what keeps a slop key from bouncing a
// whole call back as a retry. This suite pins both properties across every
// model-facing schema the package ships:
//
//   1. no `.strict()` objects (an unknown key must strip, never reject), and
//   2. no arrays of objects (the high-entropy shape the failures cluster in).
//
// Introspection is via `z.toJSONSchema`, where `.strict()` surfaces as
// `additionalProperties: false` and a nested object array is directly visible.
// (The AI SDK *advertises* `additionalProperties: false` on every object — it
// adds that during its own conversion — while validating with plain zod strip
// mode; these assertions target the zod source of truth, not the advertised
// form.)

const root = realpathSync(mkdtempSync(join(tmpdir(), "agent-sdk-schema-")));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const stdlib = createStdlib({
  workspaceRoot: root,
  stateDir: join(root, ".agent"),
});
const tasks = buildTasksToolset({
  registry: stdlib.registry,
  backgroundables: stdlib.backgroundables,
});
if (tasks === null) throw new Error("stdlib always has the bash backgroundable");
const sandbox = createSandboxFileTools({ workspaceRoot: "/workspace" });

const { tasks: _tasksDynamic, ...stdlibStatic } = stdlib.tools;
const allTools: Record<string, { inputSchema: unknown }> = {
  ...prefixed("stdlib", stdlibStatic),
  ...prefixed("tasks", tasks),
  ...prefixed("sandbox", sandbox.tools),
};

function prefixed<T extends Record<string, { inputSchema: unknown }>>(
  prefix: string,
  tools: T,
): Record<string, { inputSchema: unknown }> {
  return Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => [`${prefix}.${name}`, tool]),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isZodSchema(value: unknown): value is z.ZodType {
  return typeof value === "object" && value !== null && "_zod" in value;
}

/** Walk a JSON schema and collect shape-contract violations with their paths. */
function collectViolations(node: unknown, path: string, out: string[]): void {
  if (Array.isArray(node)) {
    node.forEach((child, i) => collectViolations(child, `${path}[${i}]`, out));
    return;
  }
  if (!isRecord(node)) return;
  if (node.additionalProperties === false) {
    out.push(`${path}: additionalProperties: false (a .strict() model-facing object)`);
  }
  if (node.type === "array" && isRecord(node.items) && node.items.type === "object") {
    out.push(`${path}: array of objects`);
  }
  for (const [key, value] of Object.entries(node)) {
    collectViolations(value, `${path}.${key}`, out);
  }
}

describe("model-facing schema shape", () => {
  // Guard the iteration itself: a refactor that empties the collected set
  // would make every assertion below vacuously pass (the notCalledTool trap
  // from rib/learnings/20).
  test("covers the full shipped toolset", () => {
    expect(Object.keys(allTools).sort()).toEqual(
      [
        "sandbox.edit",
        "sandbox.glob",
        "sandbox.grep",
        "sandbox.read",
        "sandbox.write",
        "stdlib.bash",
        "stdlib.edit",
        "stdlib.glob",
        "stdlib.grep",
        "stdlib.read",
        "stdlib.webfetch",
        "stdlib.write",
        "tasks.await_task",
        "tasks.check_tasks",
        "tasks.run_async",
      ].sort(),
    );
  });

  test("every schema is flat and strip-mode: no object arrays, no .strict()", () => {
    const violations: string[] = [];
    for (const [name, tool] of Object.entries(allTools)) {
      if (!isZodSchema(tool.inputSchema)) {
        violations.push(`${name}: inputSchema is not a zod schema`);
        continue;
      }
      collectViolations(z.toJSONSchema(tool.inputSchema, { io: "input" }), name, violations);
    }
    expect(violations).toEqual([]);
  });

  test("an unknown extra key strips instead of rejecting", () => {
    // The exact failure documented on newer Claude models: a byte-correct edit
    // call plus an invented trailing key. It must parse, and the key must be
    // gone — a reject here would turn model slop into a visible retry loop.
    const schema = stdlib.tools.edit.inputSchema;
    if (!isZodSchema(schema)) throw new Error("edit's inputSchema is a zod schema");
    const parsed = schema.safeParse({
      path: "src/app.ts",
      old_string: "before",
      new_string: "after",
      requireUnique: true,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual({
        path: "src/app.ts",
        old_string: "before",
        new_string: "after",
      });
    }
  });
});
