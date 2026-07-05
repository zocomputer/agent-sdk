import { beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The parity-by-construction guard. eve's isolation boundary means an absent
// tool slot falls back to the FRAMEWORK default — a parent tool without a
// re-export silently ships a child whose tool surface differs from what its
// description advertises, and a missing ask_question disable shim resurrects
// HITL in a child whose contract is decide-and-report. This test pins tools/
// to exactly the SDK manifest (parent tools + one shim per disabled builtin),
// checks every re-export is the PARENT's instance, and pins the mock gate.
//
// Resolvability gate: this example resolves @zocomputer/agent-sdk only
// through its own `bun install` (standalone project, not a workspace member),
// but a workspace-wide `bun test packages` run also discovers this file. Skip
// when the dep isn't installed — the Agent SDK E2E job runs the example's own
// `bun test` with the install and executes these for real; the SDK's unit
// suite keeps a resolution-free file-set pin (src/example-coder.test.ts).
const sdkInstalled = (() => {
  try {
    import.meta.resolve("@zocomputer/agent-sdk");
    return true;
  } catch {
    return false;
  }
})();

const toolsDir = join(import.meta.dir, "tools");
const parentToolsDir = join(import.meta.dir, "..", "..", "tools");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function moduleNames(dir: string): string[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => name.replace(/\.ts$/, ""))
    .sort();
}

async function taskManifest(): Promise<{
  expected: readonly string[];
  disabledBuiltins: readonly string[];
  childOverrides: readonly string[];
}> {
  const sdk: unknown = await import("@zocomputer/agent-sdk");
  if (
    !isRecord(sdk) ||
    typeof sdk.expectedTaskToolNames !== "function" ||
    !Array.isArray(sdk.TASK_DISABLED_BUILTINS) ||
    !Array.isArray(sdk.TASK_CHILD_TOOL_OVERRIDES)
  ) {
    throw new Error("expected the SDK to export the task manifest helpers");
  }
  const expected = (sdk.expectedTaskToolNames as (o: unknown) => string[])({
    parentToolNames: moduleNames(parentToolsDir),
  });
  return {
    expected,
    disabledBuiltins: sdk.TASK_DISABLED_BUILTINS as readonly string[],
    childOverrides: sdk.TASK_CHILD_TOOL_OVERRIDES as readonly string[],
  };
}

beforeAll(() => {
  // The stdlib roots itself at CODER_WORKDIR at import time (state dir
  // included); point it at a temp dir so importing agent modules can never
  // write into the example.
  process.env.CODER_WORKDIR = mkdtempSync(join(tmpdir(), "coder-manifest-test-"));
});

describe.skipIf(!sdkInstalled)("task_fast subagent manifest", () => {
  const fileNames = moduleNames(toolsDir);

  test("tools/ is exactly the parent surface plus the disable shims", async () => {
    const manifest = await taskManifest();
    expect(fileNames).toEqual([...manifest.expected]);
  });

  test("shims are the disable sentinel; overrides are child-safe; the rest are the parent's instances", async () => {
    const manifest = await taskManifest();
    for (const name of fileNames) {
      const mod: unknown = await import(join(toolsDir, `${name}.ts`));
      if (!isRecord(mod) || !("default" in mod)) {
        throw new Error(`${name}.ts: expected a default export`);
      }
      if (manifest.disabledBuiltins.includes(name)) {
        // eve's DisabledToolSentinel discriminant, matched structurally.
        if (!isRecord(mod.default)) throw new Error(`${name}.ts: expected a sentinel object`);
        expect(mod.default.kind).toBe("eve:disabled-tool");
        continue;
      }
      const parentMod: unknown = await import(join(parentToolsDir, `${name}.ts`));
      if (!isRecord(parentMod) || !("default" in parentMod)) {
        throw new Error(`${name}.ts: expected the parent to export a default`);
      }
      if (manifest.childOverrides.includes(name)) {
        // read/webfetch are DELIBERATELY not the parent's instances: the
        // child has no park-delivery hook, so the parent's attachment-enabled
        // tools would promise media that never arrives (see ../lib/child-tools.ts).
        if (!isRecord(mod.default)) throw new Error(`${name}.ts: expected a tool`);
        expect(mod.default.kind).not.toBe("eve:disabled-tool");
        expect(typeof mod.default.execute).toBe("function");
        expect(mod.default).not.toBe(parentMod.default);
        continue;
      }
      // Identity with the parent's module is the parity property: the child
      // runs the same tool instance, not a diverged copy (this also covers
      // re-exported parent disable shims like read_file/write_file).
      expect(mod.default).toBe(parentMod.default);
    }
  });

  test("the task agent swaps to the mock under the gate and a slug otherwise", async () => {
    const load = async (gate: string) => {
      // The agent module reads env at import; a query suffix loads a fresh
      // module instance per gate value.
      const href = `${join(import.meta.dir, "agent.ts")}?gate=${gate}`;
      process.env.CODER_MOCK_MODEL = gate === "on" ? "1" : "";
      const mod: unknown = await import(href);
      if (!isRecord(mod) || !isRecord(mod.default)) throw new Error("expected an agent config");
      return mod.default;
    };
    const mocked = await load("on");
    expect(typeof mocked.description).toBe("string");
    expect(String(mocked.description).length).toBeGreaterThan(0);
    // Under the gate the model is a provider instance, not a gateway slug.
    expect(isRecord(mocked.model) && mocked.model.specificationVersion === "v4").toBe(true);
    const live = await load("off");
    expect(typeof live.model).toBe("string");
    delete process.env.CODER_MOCK_MODEL;
  });
});
