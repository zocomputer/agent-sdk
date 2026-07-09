import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ToolContext } from "eve/tools";
import { createTaskRegistry } from "../async-tasks";
import { createBashOp } from "../backgroundable";
import { createCommandRunner } from "../run";
import { createWorkspace } from "../workspace";
import { buildTasksToolset } from "./tasks";

const root = mkdtempSync(join(tmpdir(), "agent-sdk-tasks-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const workspace = createWorkspace(root);
const runner = createCommandRunner({
  workspace,
  spillDir: join(root, ".state", "tool-outputs"),
});
const registry = createTaskRegistry({ storePath: join(root, ".state", "tasks.json") });
const toolset = buildTasksToolset({
  registry,
  backgroundables: [createBashOp(runner)],
});
if (!toolset) throw new Error("toolset should exist with one backgroundable");

const ctx: ToolContext = {
  session: {
    id: "tasks-test-session",
    auth: { current: null, initiator: null },
    turn: { id: "turn-1", sequence: 1 },
  },
  getSandbox: () => Promise.reject(new Error("no sandbox in tests")),
  getSkill: () => {
    throw new Error("no skills in tests");
  },
  getToken: () => Promise.reject(new Error("no auth in tests")),
  requireAuth: () => {
    throw new Error("no auth in tests");
  },
};

describe("await_task failure hygiene", () => {
  test("an unknown task id names the recovery path (check_tasks)", async () => {
    expect(
      toolset.await_task.execute({ task_id: "task_999" }, ctx),
    ).rejects.toThrow(/No such task: task_999\. Call check_tasks/);
  });
});

describe("run_async failure hygiene", () => {
  test("an invalid notify.pattern fails before any work starts", () => {
    const before = registry.listTasks().length;
    // run_async throws synchronously — the watcher is built before start().
    expect(() =>
      toolset.run_async.execute(
        {
          tool: "bash",
          input: { command: "sleep 5" },
          notify: { pattern: "(", reason: "unterminated group" },
        },
        ctx,
      ),
    ).toThrow(/Invalid notify\.pattern — nothing was started/);
    // Nothing was registered: the rejection really did precede the spawn.
    expect(registry.listTasks().length).toBe(before);
  });

  test("bad op input rejects with the field named, and starts nothing", () => {
    const before = registry.listTasks().length;
    expect(() =>
      toolset.run_async.execute({ tool: "bash", input: { command: 42 } }, ctx),
    ).toThrow(/Invalid input for "bash" — nothing was started/);
    expect(registry.listTasks().length).toBe(before);
  });
});
