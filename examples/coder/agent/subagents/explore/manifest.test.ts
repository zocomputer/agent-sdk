import { beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The read-only-by-construction guard. eve's isolation boundary means an
// absent tool slot falls back to the FRAMEWORK default — a missing bash.ts
// disable shim silently resurrects full shell access in the "read-only"
// child. This test pins tools/ to exactly the SDK manifest (the three read
// tools + one disable shim per writing builtin) and checks every file exports
// what it claims.
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function exploreManifest(): Promise<{
  toolNames: readonly string[];
  disabledBuiltins: readonly string[];
}> {
  const sdk: unknown = await import("@zocomputer/agent-sdk");
  if (
    !isRecord(sdk) ||
    !Array.isArray(sdk.EXPLORE_TOOL_NAMES) ||
    !Array.isArray(sdk.EXPLORE_DISABLED_BUILTINS)
  ) {
    throw new Error("expected the SDK to export the explore manifest");
  }
  return {
    toolNames: sdk.EXPLORE_TOOL_NAMES as readonly string[],
    disabledBuiltins: sdk.EXPLORE_DISABLED_BUILTINS as readonly string[],
  };
}

beforeAll(() => {
  // The stdlib roots itself at CODER_WORKDIR at import time (state dir
  // included); point it at a temp dir so importing agent modules can never
  // write into the example.
  process.env.CODER_WORKDIR = mkdtempSync(join(tmpdir(), "coder-manifest-test-"));
});

describe.skipIf(!sdkInstalled)("explore subagent manifest", () => {
  const fileNames = readdirSync(toolsDir)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => name.replace(/\.ts$/, ""))
    .sort();

  test("tools/ is exactly the explore toolset plus the disable shims", async () => {
    const manifest = await exploreManifest();
    const expected = [...manifest.toolNames, ...manifest.disabledBuiltins].sort();
    expect(fileNames).toEqual(expected);
  });

  test("every disabled builtin exports the disable sentinel; every tool is a real tool", async () => {
    const manifest = await exploreManifest();
    for (const name of fileNames) {
      const mod: unknown = await import(join(toolsDir, `${name}.ts`));
      if (!isRecord(mod) || !isRecord(mod.default)) {
        throw new Error(`${name}.ts: expected a default export`);
      }
      const def = mod.default;
      if (manifest.disabledBuiltins.includes(name)) {
        // eve's DisabledToolSentinel discriminant, matched structurally.
        expect(def.kind).toBe("eve:disabled-tool");
      } else {
        expect(def.kind).not.toBe("eve:disabled-tool");
        expect(typeof def.description).toBe("string");
        expect(typeof def.execute).toBe("function");
      }
    }
  });

  test("the explore agent swaps to the mock under the gate and a slug otherwise", async () => {
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
