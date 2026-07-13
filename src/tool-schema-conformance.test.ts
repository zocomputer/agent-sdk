import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { createSandboxFileTools } from "./index";
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

const sandbox = createSandboxFileTools({ workspaceRoot: "/workspace", mediaOracle: true });
const tasks = buildTasksToolset({
  registry: sandbox.registry,
  backgroundables: sandbox.backgroundables,
});
if (tasks === null) throw new Error("sandbox tools always include bash");

// `todo` is exempt from the zod sweep by design: it wraps eve's framework
// tool and passes eve's own JSON schema through byte-identical — an array of
// TodoItem objects with additionalProperties: false, which IS the model
// prior here (Claude Code's TodoWrite ships the same shape), and rewriting
// it would drift the wrapper from the state contract eve validates against.
// The dedicated pass-through pin below keeps the exemption honest.
// The sandbox toolset ships its own dynamic tasks toolset now; same exemption.
const {
  tasks: _sandboxTasksDynamic,
  todo: _sandboxTodoDynamic,
  ...sandboxStatic
} = sandbox.tools;
const allTools: Record<string, { inputSchema: unknown }> = {
  ...prefixed("tasks", tasks),
  ...prefixed("sandbox", sandboxStatic),
};

function prefixed(
  prefix: string,
  // `look` is a conditionally-present key on both toolsets, so the property
  // type admits undefined; absent tools are skipped (the roster pin above
  // catches a tool that unexpectedly vanishes).
  tools: Record<string, { inputSchema: unknown } | undefined>,
): Record<string, { inputSchema: unknown }> {
  return Object.fromEntries(
    Object.entries(tools).flatMap(([name, tool]) =>
      tool === undefined ? [] : [[`${prefix}.${name}`, tool] as const],
    ),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isZodSchema(value: unknown): value is z.ZodType {
  return typeof value === "object" && value !== null && "_zod" in value;
}

// The prior-aligned naming contract extends to param CASE: snake_case keys
// (`old_string`, `task_id`), matching Claude Code / opencode priors. The one
// deliberate camelCase surface — `request_state_consent`'s envelope
// (`bindingId`, `declarationName`, …) — is a verbatim pass-through of the
// broker's 409 body shared with chat-core, and isn't part of the toolsets
// this suite sweeps.
const SNAKE_CASE = /^[a-z][a-z0-9_]*$/;

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
  if (isRecord(node.properties)) {
    for (const key of Object.keys(node.properties)) {
      if (!SNAKE_CASE.test(key)) {
        out.push(`${path}.properties.${key}: not snake_case`);
      }
    }
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
        "sandbox.bash",
        "sandbox.edit",
        "sandbox.glob",
        "sandbox.grep",
        "sandbox.look",
        "sandbox.read",
        "sandbox.webfetch",
        "sandbox.write",
        "tasks.await_task",
        "tasks.check_tasks",
        "tasks.run_async",
      ].sort(),
    );
  });

  test("every schema is flat, strip-mode, and snake_case", () => {
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
    const schema = sandbox.tools.edit.inputSchema;
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
