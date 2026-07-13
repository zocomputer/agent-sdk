import { describe, expect, test } from "bun:test";
import type { ToolContext } from "eve/tools";
import type { TaskRegistry } from "../async-tasks";
import type { CommandRunner, RunResult } from "../run";
import { createBashTool } from "./bash";

function context(signal: AbortSignal): ToolContext {
  return {
    abortSignal: signal,
    callId: "call-1",
    session: {
      id: "session-1",
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

function harness() {
  let kills = 0;
  let spawned = 0;
  let settleResult: ((result: RunResult) => void) | undefined;
  const result = new Promise<RunResult>((resolve) => {
    settleResult = resolve;
  });
  const runner: CommandRunner = {
    startCommand: () => ({
      result,
      progress: () => ({
        stdout: "",
        stderr: "",
        stdoutBytes: 0,
        stderrBytes: 0,
        stdoutTruncated: false,
        stderrTruncated: false,
      }),
      kill: () => {
        kills += 1;
      },
    }),
    runCommand: () => result,
  };
  const registry: TaskRegistry = {
    spawnTask: () => {
      spawned += 1;
      return "task_1";
    },
    updateTaskProgress: () => {},
    listTasks: () => [],
    getTask: () => undefined,
    awaitTask: () => Promise.resolve(undefined),
  };
  const tool = createBashTool({
    workdir: "/workspace",
    runner,
    registry,
    noun: "workspace",
  });
  return {
    tool,
    kills: () => kills,
    spawned: () => spawned,
    settle: () =>
      settleResult?.({ stdout: "", stderr: "", exitCode: 0, timedOut: false }),
  };
}

describe("createBashTool cancellation", () => {
  test("kills a foreground command when the turn is cancelled", async () => {
    const { tool, kills, spawned } = harness();
    const controller = new AbortController();
    const pending = tool.execute(
      { command: "slow", foreground_ms: 5_000 },
      context(controller.signal),
    );
    controller.abort(new Error("turn cancelled"));
    await expect(pending).rejects.toThrow("turn cancelled");
    expect(kills()).toBe(1);
    expect(spawned()).toBe(0);
  });

  test("leaves a command detached after returning its task id", async () => {
    const { tool, kills, spawned, settle } = harness();
    const controller = new AbortController();
    const result = await tool.execute(
      { command: "server", foreground_ms: 1 },
      context(controller.signal),
    );
    expect(result).toMatchObject({ mode: "backgrounded", task_id: "task_1" });
    controller.abort(new Error("turn cancelled"));
    expect(kills()).toBe(0);
    expect(spawned()).toBe(1);
    settle();
  });

  test("a foreground timeout wins once over a same-tick late abort", async () => {
    const { tool, kills, spawned, settle } = harness();
    const controller = new AbortController();
    const pending = tool.execute(
      { command: "server", foreground_ms: 1 },
      context(controller.signal),
    );
    setTimeout(() => controller.abort(new Error("late cancellation")), 1);
    await expect(pending).resolves.toMatchObject({ mode: "backgrounded" });
    expect(kills()).toBe(0);
    expect(spawned()).toBe(1);
    settle();
  });

  test("removes cancellation after a foreground command completes", async () => {
    const { tool, kills, settle } = harness();
    const controller = new AbortController();
    const pending = tool.execute(
      { command: "quick", foreground_ms: 5_000 },
      context(controller.signal),
    );
    settle();
    await expect(pending).resolves.toMatchObject({ mode: "completed" });
    controller.abort(new Error("late cancellation"));
    expect(kills()).toBe(0);
  });
});
