// Freshness guard for examples/coder — the SDK's prescribed wiring and the
// agent under test for the mock e2e eval suite (examples/coder/evals-mock,
// CI's Agent SDK E2E job). This file pins only what needs NO module
// resolution into the example: the task_fast subagent's tools/ directory
// shape against the parent's. eve's isolation boundary means an absent tools/
// slot falls back to the FRAMEWORK default — a parent tool without a
// re-export silently ships a child whose tool surface differs from what its
// description advertises, and a missing ask_question disable shim resurrects
// HITL in a child whose contract is decide-and-report — so the file set is
// load-bearing.
//
// The module-level assertions (each shim exports the disable sentinel, the
// re-exports are the parent's instances, the mock gates swap the model) live
// in the example itself (examples/coder/agent/**.test.ts) and run via
// `bun test` inside `test:agent-sdk-e2e`: the coder is a standalone project
// whose `@zocomputer/agent-sdk` dep only resolves through its own
// node_modules (bun links workspace packages per-consumer, and nothing in the
// workspace consumes this package), so importing example modules from here
// would fail in any environment that hasn't installed the example.
import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { expectedTaskToolNames } from "./task";

const coderAgentDir = resolve(import.meta.dir, "..", "examples", "coder", "agent");

function moduleNames(dir: string): string[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => name.replace(/\.ts$/, ""))
    .sort();
}

describe("example coder: task_fast subagent manifest", () => {
  test("tools/ is exactly the parent surface plus the disable shims", () => {
    const parentToolNames = moduleNames(join(coderAgentDir, "tools"));
    const fileNames = moduleNames(join(coderAgentDir, "subagents", "task_fast", "tools"));
    expect(fileNames).toEqual(expectedTaskToolNames({ parentToolNames }));
  });
});
