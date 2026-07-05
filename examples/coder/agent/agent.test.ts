import { describe, afterEach, expect, test } from "bun:test";

// The e2e eval suite (evals-mock/, CI's Agent SDK E2E job) depends on
// CODER_MOCK_MODEL=1 swapping inference for the SDK's mock — pin the gate so
// a refactor of agent.ts can't silently point [mock:*] prompts at a live
// model. The factory reads env per call, so both sides test directly.
//
// Resolvability gate: this example resolves @zocomputer/agent-sdk only
// through its own `bun install` (it's a standalone project, not a workspace
// member), but a workspace-wide `bun test packages` run also discovers this
// file. Skip when the dep isn't installed — the Agent SDK E2E job runs the
// example's own `bun test` with the install and executes these for real.
const sdkInstalled = (() => {
  try {
    import.meta.resolve("@zocomputer/agent-sdk");
    return true;
  } catch {
    return false;
  }
})();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

describe.skipIf(!sdkInstalled)("the mock gate in agent.ts", () => {
  afterEach(() => {
    delete process.env.CODER_MOCK_MODEL;
    delete process.env.CODER_MOCK_CHUNKS;
  });

  test("CODER_MOCK_MODEL=1 yields the mock model instance", async () => {
    const { default: agent } = await import("./agent");
    process.env.CODER_MOCK_MODEL = "1";
    process.env.CODER_MOCK_CHUNKS = "7";
    const config: unknown = agent();
    if (!isRecord(config) || !isRecord(config.model)) throw new Error("expected a model instance");
    expect(config.model.specificationVersion).toBe("v4");
  });

  test("unset yields a gateway slug", async () => {
    const { default: agent } = await import("./agent");
    delete process.env.CODER_MOCK_MODEL;
    const config: unknown = agent();
    if (!isRecord(config)) throw new Error("expected an agent config");
    expect(typeof config.model).toBe("string");
  });
});
