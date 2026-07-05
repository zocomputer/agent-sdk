// Freshness guard for examples/coder — the SDK's prescribed wiring and the
// agent under test for the mock e2e eval suite (examples/coder/evals-mock,
// CI's Agent SDK E2E job). This file pins only what needs NO module
// resolution into the example: the explore subagent's tools/ directory shape.
// eve's isolation boundary means an absent tools/ slot falls back to the
// FRAMEWORK default — a missing bash.ts disable shim silently resurrects full
// shell access in the "read-only" child — so the file set is load-bearing.
//
// The module-level assertions (each shim exports the disable sentinel, the
// mock gates swap the model) live in the example itself
// (examples/coder/agent/**.test.ts) and run via `bun test` inside
// `test:agent-sdk-e2e`: the coder is a standalone project whose
// `@zocomputer/agent-sdk` dep only resolves through its own node_modules
// (bun links workspace packages per-consumer, and nothing in the workspace
// consumes this package), so importing example modules from here would fail
// in any environment that hasn't installed the example.
import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { EXPLORE_DISABLED_BUILTINS, EXPLORE_TOOL_NAMES } from "./explore";

const exploreToolsDir = resolve(
  import.meta.dir,
  "..",
  "examples",
  "coder",
  "agent",
  "subagents",
  "explore",
  "tools",
);

describe("example coder: explore subagent manifest", () => {
  test("tools/ is exactly the explore toolset plus the disable shims", () => {
    const fileNames = readdirSync(exploreToolsDir)
      .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
      .map((name) => name.replace(/\.ts$/, ""))
      .sort();
    const expected = [...EXPLORE_TOOL_NAMES, ...EXPLORE_DISABLED_BUILTINS].sort();
    expect(fileNames).toEqual(expected);
  });
});
