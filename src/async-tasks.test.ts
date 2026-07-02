import { afterAll, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTaskRegistry } from "./async-tasks";

const dir = mkdtempSync(join(tmpdir(), "stdlib-tasks-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

let storeCounter = 0;
function freshStore(): string {
  return join(dir, `tasks-${++storeCounter}.json`);
}

test("a resolving task settles to done with its result", async () => {
  const registry = createTaskRegistry({ storePath: freshStore() });
  const id = registry.spawnTask("bash", "echo hi", Promise.resolve({ stdout: "hi" }));
  const task = await registry.awaitTask(id, 1_000);
  expect(task?.status).toBe("done");
  if (task?.status === "done") expect(task.result).toMatchObject({ stdout: "hi" });
});

test("a rejecting task settles to error with the message", async () => {
  const registry = createTaskRegistry({ storePath: freshStore() });
  const id = registry.spawnTask("bash", "boom", Promise.reject(new Error("exploded")));
  const task = await registry.awaitTask(id, 1_000);
  expect(task?.status).toBe("error");
  if (task?.status === "error") expect(task.error).toBe("exploded");
});

test("awaitTask returns a still-running task when the wait times out", async () => {
  const registry = createTaskRegistry({ storePath: freshStore() });
  const id = registry.spawnTask(
    "bash",
    "slow",
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  );
  const task = await registry.awaitTask(id, 10);
  expect(task?.status).toBe("running");
  expect(registry.getTask("task_999")).toBeUndefined();
});

test("settled tasks persist across registries; running ones reload as lost", async () => {
  const storePath = freshStore();
  const first = createTaskRegistry({ storePath });
  const doneId = first.spawnTask("bash", "quick", Promise.resolve("ok"));
  await first.awaitTask(doneId, 1_000);
  const runningId = first.spawnTask("bash", "endless", new Promise(() => {}));

  // Simulate a restart: a new registry over the same store. The done result
  // survives; the in-flight promise can't be reattached, so it's lost.
  const second = createTaskRegistry({ storePath });
  expect(second.getTask(doneId)?.status).toBe("done");
  expect(second.getTask(runningId)?.status).toBe("lost");

  // Ids keep counting past the persisted max — no reuse after restart.
  const nextId = second.spawnTask("bash", "next", Promise.resolve(null));
  expect(nextId).toBe(`task_${Number(runningId.slice("task_".length)) + 1}`);
});

test("updateTaskProgress only touches running tasks", async () => {
  const registry = createTaskRegistry({ storePath: freshStore() });
  const id = registry.spawnTask("bash", "slow", new Promise(() => {}));
  registry.updateTaskProgress(id, { stdout: "partial" });
  expect(registry.getTask(id)?.progress).toMatchObject({ stdout: "partial" });

  const doneId = registry.spawnTask("bash", "quick", Promise.resolve("ok"));
  await registry.awaitTask(doneId, 1_000);
  registry.updateTaskProgress(doneId, { stdout: "late" });
  expect(registry.getTask(doneId)?.progress).toBeUndefined();
});
