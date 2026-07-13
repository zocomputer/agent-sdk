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

function ctxWith(sessionId: string): ToolContext {
  return {
    abortSignal: new AbortController().signal,
    callId: "call-1",
    session: {
      id: sessionId,
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
}
const ctx = ctxWith("tasks-test-session");

describe("check_tasks session scoping", () => {
  test("lists only the calling session's tasks; await_task stays id-scoped", async () => {
    const mine = await toolset.run_async.execute(
      { tool: "bash", input: { command: "echo mine" } },
      ctxWith("session-one"),
    );
    const theirs = await toolset.run_async.execute(
      { tool: "bash", input: { command: "echo theirs" } },
      ctxWith("session-two"),
    );

    const listed = await toolset.check_tasks.execute({}, ctxWith("session-one"));
    const ids = listed.tasks.map((t) => t.task_id);
    expect(ids).toContain(mine.task_id);
    expect(ids).not.toContain(theirs.task_id);

    // A task id is an unguessable capability — lookups by id stay unscoped.
    const awaited = await toolset.await_task.execute(
      { task_id: theirs.task_id, wait_ms: 5_000 },
      ctxWith("session-one"),
    );
    expect(awaited).toMatchObject({ task_id: theirs.task_id, status: "done" });
  });
});

describe("await_task failure hygiene", () => {
  test("an unknown task id names the recovery path (check_tasks)", async () => {
    expect(
      toolset.await_task.execute({ task_id: "task_999" }, ctx),
    ).rejects.toThrow(/No such task: task_999\. Call check_tasks/);
  });
});

describe("run_async failure hygiene", () => {
  test("bad op input rejects with the field named, and starts nothing", () => {
    const before = registry.listTasks().length;
    expect(() =>
      toolset.run_async.execute({ tool: "bash", input: { command: 42 } }, ctx),
    ).toThrow(/Invalid input for "bash" — nothing was started/);
    expect(registry.listTasks().length).toBe(before);
  });
});
