import { describe, expect, test } from "bun:test";
import {
  createOutputWatcher,
  formatCompletionNotification,
  formatWatchNotification,
} from "./watch-output";

describe("createOutputWatcher", () => {
  test("matches complete lines against the pattern", () => {
    const w = createOutputWatcher({ pattern: "FAIL", now: () => 0 });
    expect(w.feed("ok line\nFAIL: test one\nanother ok\n")).toEqual(["FAIL: test one"]);
  });

  test("buffers partial lines across chunks", () => {
    const w = createOutputWatcher({ pattern: "listening on", now: () => 0 });
    expect(w.feed("server listen")).toBeNull();
    expect(w.feed("ing on :3000\nready\n")).toEqual(["server listening on :3000"]);
  });

  test("flush treats the unterminated tail as a final line", () => {
    const w = createOutputWatcher({ pattern: "done", now: () => 0 });
    expect(w.feed("almost done")).toBeNull();
    expect(w.flush()).toEqual(["almost done"]);
    expect(w.flush()).toBeNull();
  });

  test("debounces match batches", () => {
    let t = 0;
    const w = createOutputWatcher({ pattern: "ERR", debounceMs: 1000, now: () => t });
    expect(w.feed("ERR one\n")).toEqual(["ERR one"]);
    t = 500;
    expect(w.feed("ERR two\n")).toBeNull(); // inside the window — dropped
    t = 1500;
    expect(w.feed("ERR three\n")).toEqual(["ERR three"]);
  });

  test("caps lifetime notifications", () => {
    let t = 0;
    const w = createOutputWatcher({
      pattern: "x",
      debounceMs: 1,
      maxNotifications: 2,
      now: () => t,
    });
    expect(w.feed("x1\n")).toEqual(["x1"]);
    t += 10;
    expect(w.feed("x2\n")).toEqual(["x2"]);
    t += 10;
    expect(w.feed("x3\n")).toBeNull();
  });

  test("multiple matches in one chunk arrive as one batch", () => {
    const w = createOutputWatcher({ pattern: "FAIL", now: () => 0 });
    expect(w.feed("FAIL a\nok\nFAIL b\n")).toEqual(["FAIL a", "FAIL b"]);
  });

  test("an invalid regex throws at build time", () => {
    expect(() => createOutputWatcher({ pattern: "(" })).toThrow();
  });
});

describe("notification formatting", () => {
  test("watch notification names the task, reason, and matched lines", () => {
    const text = formatWatchNotification({
      taskId: "task_3",
      label: "bun test",
      reason: "test failures",
      lines: ["FAIL foo.test.ts"],
    });
    expect(text).toContain("task_3");
    expect(text).toContain("bun test");
    expect(text).toContain("test failures");
    expect(text).toContain("FAIL foo.test.ts");
  });

  test("completion notification reports done and error outcomes", () => {
    expect(
      formatCompletionNotification({ taskId: "task_1", label: "build", status: "done" }),
    ).toContain("finished");
    const failed = formatCompletionNotification({
      taskId: "task_2",
      label: "deploy",
      status: "error",
      error: "exit 1",
    });
    expect(failed).toContain("failed");
    expect(failed).toContain("exit 1");
  });
});
