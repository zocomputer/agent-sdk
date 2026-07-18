import { afterAll, describe, expect, spyOn, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ToolContext } from "eve/tools";
import { createTaskRegistry, taskScopeForSession } from "../async-tasks";
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
    toolName: "task",
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
const missingTaskId = "task_00000000-0000-4000-8000-000000000000";

async function rejectionMessage(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("Expected promise to reject");
}

describe("check_tasks session scoping", () => {
  test("lists and awaits only the calling session's tasks", async () => {
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
    expect(mine.task_id).toMatch(
      /^task_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );

    const foreignMessage = await rejectionMessage(
      Promise.resolve(
        toolset.await_task.execute(
          { task_id: theirs.task_id, wait_ms: 5_000 },
          ctxWith("session-one"),
        ),
      ),
    );
    const missingMessage = await rejectionMessage(
      Promise.resolve(
        toolset.await_task.execute(
          { task_id: missingTaskId, wait_ms: 5_000 },
          ctxWith("session-one"),
        ),
      ),
    );
    expect(foreignMessage.replace(theirs.task_id, "<task_id>")).toBe(
      missingMessage.replace(missingTaskId, "<task_id>"),
    );

    const mineResult = await toolset.await_task.execute(
      { task_id: mine.task_id, wait_ms: 5_000 },
      ctxWith("session-one"),
    );
    expect(mineResult).toMatchObject({ task_id: mine.task_id, status: "done" });
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
    const scope = taskScopeForSession(ctx.session.id);
    const before = registry.listTasks(scope).length;
    expect(() =>
      toolset.run_async.execute({ tool: "bash", input: { command: 42 } }, ctx),
    ).toThrow(/Invalid input for "bash" — nothing was started/);
    expect(registry.listTasks(scope).length).toBe(before);
  });

  test("missing session context fails before work starts or task state is read", async () => {
    const start = spyOn(runner, "startCommand");
    expect(() =>
      // @ts-expect-error Exercise the runtime fail-closed boundary.
      toolset.run_async.execute({ tool: "bash", input: { command: "echo orphan" } }, undefined),
    ).toThrow(/require an active session/);
    // @ts-expect-error Exercise the runtime fail-closed boundary.
    expect(() => toolset.check_tasks.execute({}, undefined)).toThrow(/require an active session/);
    await expect(
      // @ts-expect-error Exercise the runtime fail-closed boundary.
      toolset.await_task.execute({ task_id: missingTaskId }, undefined),
    ).rejects.toThrow(/require an active session/);
    expect(start).not.toHaveBeenCalled();
    start.mockRestore();
  });
});
