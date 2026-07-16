import { afterAll, expect, spyOn, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  __resetTaskRegistryCacheForTests,
  createTaskRegistry,
  parseTaskId,
  taskScopeForSession,
  type TaskId,
} from "./async-tasks";

const dir = mkdtempSync(join(tmpdir(), "stdlib-tasks-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const sessionA = taskScopeForSession("session-a");
const sessionB = taskScopeForSession("session-b");

function requiredTaskId(value: string): TaskId {
  const id = parseTaskId(value);
  if (id === null) throw new Error(`Invalid test task id: ${value}`);
  return id;
}

const missingId = requiredTaskId("task_00000000-0000-4000-8000-000000000000");
let storeCounter = 0;
function freshStore(): string {
  return join(dir, `tasks-${++storeCounter}.json`);
}

function legacyStoreTasks(value: unknown): unknown[] {
  if (typeof value !== "object" || value === null || !("tasks" in value)) return [];
  return Array.isArray(value.tasks) ? value.tasks : [];
}

function scopedStoreTasks(value: unknown): unknown[] {
  if (
    typeof value !== "object" ||
    value === null ||
    !("version" in value) ||
    value.version !== 2 ||
    !("scopedTasks" in value)
  ) {
    return [];
  }
  return Array.isArray(value.scopedTasks) ? value.scopedTasks : [];
}

test("generates unique UUID-backed task ids and rejects legacy ids", () => {
  const registry = createTaskRegistry({ storePath: freshStore() });
  const ids = Array.from({ length: 32 }, () =>
    registry.spawnTask(sessionA, "bash", "pending", new Promise(() => {})),
  );

  expect(new Set(ids).size).toBe(ids.length);
  for (const id of ids) {
    expect(id).toMatch(
      /^task_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  }
  expect(parseTaskId("task_1")).toBeNull();
});

test("accepts an injectable task id factory and rejects collisions", () => {
  const fixedId = requiredTaskId("task_00000000-0000-4000-8000-000000000002");
  const registry = createTaskRegistry({
    storePath: freshStore(),
    newTaskId: () => fixedId,
  });

  expect(registry.spawnTask(sessionA, "bash", "first", new Promise(() => {}))).toBe(fixedId);
  expect(() =>
    registry.spawnTask(sessionA, "bash", "collision", new Promise(() => {})),
  ).toThrow("Unable to allocate a unique background task id.");
});

test("does not reuse a registry cached under the legacy ABI key", () => {
  const storePath = freshStore();
  const legacyRegistry = { spawnTask: () => "task_1" };
  const legacyKey = Symbol.for("zocomputer.agent-sdk.task-registries");
  const holder = globalThis as typeof globalThis & { [key: symbol]: unknown };
  holder[legacyKey] = new Map([[storePath, legacyRegistry]]);

  try {
    expect(createTaskRegistry({ storePath })).not.toBe(legacyRegistry);
  } finally {
    delete holder[legacyKey];
  }
});

test("writes a v2-only store envelope that legacy readers reject", async () => {
  const storePath = freshStore();
  const registry = createTaskRegistry({ storePath });
  const id = registry.spawnTask(sessionA, "bash", "private", Promise.resolve("secret"));
  await registry.awaitTask(sessionA, id, 1_000);

  const persisted: unknown = JSON.parse(readFileSync(storePath, "utf8"));
  expect(persisted).toMatchObject({ version: 2 });
  expect(legacyStoreTasks(persisted)).toEqual([]);
});

test("a resolving task settles to done with its result", async () => {
  const registry = createTaskRegistry({ storePath: freshStore() });
  const id = registry.spawnTask(
    sessionA,
    "bash",
    "echo hi",
    Promise.resolve({ stdout: "hi" }),
  );
  const task = await registry.awaitTask(sessionA, id, 1_000);
  expect(task?.status).toBe("done");
  if (task?.status === "done") expect(task.result).toMatchObject({ stdout: "hi" });
});

test("a rejecting task settles to error with the message", async () => {
  const registry = createTaskRegistry({ storePath: freshStore() });
  const id = registry.spawnTask(
    sessionA,
    "bash",
    "boom",
    Promise.reject(new Error("exploded")),
  );
  const task = await registry.awaitTask(sessionA, id, 1_000);
  expect(task?.status).toBe("error");
  if (task?.status === "error") expect(task.error).toBe("exploded");
});

test("awaitTask returns a still-running task when the wait times out", async () => {
  const registry = createTaskRegistry({ storePath: freshStore() });
  const id = registry.spawnTask(
    sessionA,
    "bash",
    "slow",
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  );
  const task = await registry.awaitTask(sessionA, id, 10);
  expect(task?.status).toBe("running");
  expect(registry.getTask(sessionA, missingId)).toBeUndefined();
});

test("awaitTask stops waiting when its tool call is cancelled", async () => {
  const registry = createTaskRegistry({ storePath: freshStore() });
  const id = registry.spawnTask(sessionA, "bash", "slow", new Promise(() => {}));
  const controller = new AbortController();
  const waiting = registry.awaitTask(sessionA, id, 5_000, controller.signal);
  controller.abort(new Error("turn cancelled"));
  await expect(waiting).rejects.toThrow("turn cancelled");
  expect(registry.getTask(sessionA, id)?.status).toBe("running");
});

test("awaitTask removes its abort listener when work wins the race", async () => {
  const registry = createTaskRegistry({ storePath: freshStore() });
  let finish: (() => void) | undefined;
  const work = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const id = registry.spawnTask(sessionA, "bash", "quick", work);
  const controller = new AbortController();
  const remove = spyOn(controller.signal, "removeEventListener");
  const waiting = registry.awaitTask(sessionA, id, 5_000, controller.signal);
  finish?.();
  await waiting;
  expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
  controller.abort(new Error("late cancellation"));
  expect(registry.getTask(sessionA, id)?.status).toBe("done");
});

test("settled tasks persist across registries; running ones reload as lost", async () => {
  const storePath = freshStore();
  const first = createTaskRegistry({ storePath });
  const doneId = first.spawnTask(sessionA, "bash", "quick", Promise.resolve("ok"));
  await first.awaitTask(sessionA, doneId, 1_000);
  const runningId = first.spawnTask(sessionA, "bash", "endless", new Promise(() => {}));

  // Simulate a restart: drop the per-process dedupe so a genuinely new
  // registry loads the same store. The done result survives; the in-flight
  // promise can't be reattached, so it's lost.
  __resetTaskRegistryCacheForTests();
  const second = createTaskRegistry({ storePath });
  expect(second.getTask(sessionA, doneId)?.status).toBe("done");
  expect(second.getTask(sessionA, runningId)?.status).toBe("lost");

  const nextId = second.spawnTask(sessionA, "bash", "next", Promise.resolve(null));
  expect(nextId).not.toBe(doneId);
  expect(nextId).not.toBe(runningId);
});

test("restart conversion prunes and persists excess lost tasks", () => {
  const storePath = freshStore();
  const scopedTasks = Array.from({ length: 101 }, (_, index) => ({
    id: requiredTaskId(
      `task_00000000-0000-4000-8000-${(index + 1).toString(16).padStart(12, "0")}`,
    ),
    tool: "bash",
    label: `interrupted ${index}`,
    scope: sessionA,
    startedAt: index,
    status: "running" as const,
  }));
  writeFileSync(storePath, JSON.stringify({ version: 2, scopedTasks }), "utf8");

  const first = createTaskRegistry({ storePath });
  expect(first.listTasks(sessionA)).toHaveLength(100);
  expect(first.listTasks(sessionA).every((task) => task.status === "lost")).toBe(true);
  const persisted: unknown = JSON.parse(readFileSync(storePath, "utf8"));
  const persistedTasks = scopedStoreTasks(persisted);
  expect(persistedTasks).toHaveLength(100);
  expect(
    persistedTasks.every(
      (task) => typeof task === "object" && task !== null && "status" in task && task.status === "lost",
    ),
  ).toBe(true);

  __resetTaskRegistryCacheForTests();
  const second = createTaskRegistry({ storePath });
  expect(second.listTasks(sessionA)).toHaveLength(100);
  expect(second.listTasks(sessionA).every((task) => task.status === "lost")).toBe(true);
});

test("every task read and progress update is scoped to its owner", async () => {
  const registry = createTaskRegistry({ storePath: freshStore() });
  const mineId = registry.spawnTask(sessionA, "bash", "mine", Promise.resolve("mine-result"));
  const theirsId = registry.spawnTask(sessionB, "bash", "theirs", new Promise(() => {}));
  registry.updateTaskProgress(sessionB, theirsId, { stdout: "private-progress" });
  await registry.awaitTask(sessionA, mineId, 1_000);

  expect(registry.listTasks(sessionA).map((task) => task.id)).toEqual([mineId]);
  expect(registry.getTask(sessionA, theirsId)).toBeUndefined();
  await expect(registry.awaitTask(sessionA, theirsId, 5_000)).resolves.toBeUndefined();

  registry.updateTaskProgress(sessionA, theirsId, { stdout: "tampered" });
  expect(registry.getTask(sessionB, theirsId)?.progress).toEqual({
    stdout: "private-progress",
  });
  registry.updateTaskProgress(sessionA, mineId, { stdout: "late" });
  expect(registry.getTask(sessionA, mineId)?.progress).toBeUndefined();
});

test("a task's scope survives the store round-trip", async () => {
  const storePath = freshStore();
  const first = createTaskRegistry({ storePath });
  const id = first.spawnTask(sessionA, "bash", "scoped", Promise.resolve("ok"));
  await first.awaitTask(sessionA, id, 1_000);

  __resetTaskRegistryCacheForTests();
  const second = createTaskRegistry({ storePath });
  expect(second.getTask(sessionA, id)?.scope).toEqual(sessionA);
  expect(second.getTask(sessionB, id)).toBeUndefined();
  await expect(second.awaitTask(sessionB, id, 1_000)).resolves.toBeUndefined();
  expect(second.listTasks(sessionB)).toEqual([]);
});

test("createTaskRegistry dedupes per store path — module-graph copies share one registry", async () => {
  const storePath = freshStore();
  // The mid-session-rebuild regression: `bash` (fresh module graph) spawns into
  // one createTaskRegistry() result, the session-pinned tasks toolset holds
  // another. With per-path dedupe both calls yield the same instance, so the
  // spawned task is visible and awaitable from the "other" handle.
  const spawnerHandle = createTaskRegistry({ storePath });
  const awaiterHandle = createTaskRegistry({ storePath });
  expect(awaiterHandle).toBe(spawnerHandle);

  const id = spawnerHandle.spawnTask(
    sessionA,
    "bash",
    "bun run check",
    Promise.resolve({ exitCode: 0 }),
  );
  const task = await awaiterHandle.awaitTask(sessionA, id, 1_000);
  expect(task?.status).toBe("done");

  const other = createTaskRegistry({ storePath: freshStore() });
  expect(other).not.toBe(spawnerHandle);
  expect(other.getTask(sessionA, id)).toBeUndefined();
});

test("legacy sequential and sessionless records fail closed", () => {
  const storePath = freshStore();
  writeFileSync(
    storePath,
    JSON.stringify({
      tasks: [
        {
          id: "task_1",
          tool: "bash",
          label: "legacy secret",
          startedAt: Date.now(),
          status: "done",
          finishedAt: Date.now(),
          result: "private",
        },
      ],
    }),
    "utf8",
  );

  const registry = createTaskRegistry({ storePath });
  expect(registry.listTasks(sessionA)).toEqual([]);
});

test("the global retention cap remains bounded across session scopes", async () => {
  const registry = createTaskRegistry({ storePath: freshStore() });
  const otherId = registry.spawnTask(sessionB, "bash", "other", Promise.resolve("keep"));
  await registry.awaitTask(sessionB, otherId, 1_000);

  for (let index = 0; index < 101; index += 1) {
    const id = registry.spawnTask(sessionA, "bash", `task ${index}`, Promise.resolve(index));
    await registry.awaitTask(sessionA, id, 1_000);
  }

  expect(registry.listTasks(sessionA).length + registry.listTasks(sessionB).length).toBe(100);
});

test("settlement prunes a burst of completed tasks without another spawn", async () => {
  const registry = createTaskRegistry({ storePath: freshStore() });
  const finishes: Array<() => void> = [];
  const ids = Array.from({ length: 101 }, (_, index) => {
    const work = new Promise<void>((resolve) => finishes.push(resolve));
    return registry.spawnTask(sessionA, "bash", `burst ${index}`, work);
  });

  for (const finish of finishes) finish();
  const results = await Promise.all(
    ids.map((id) => registry.awaitTask(sessionA, id, 1_000)),
  );

  expect(results.every((task) => task?.status === "done")).toBe(true);
  expect(registry.listTasks(sessionA)).toHaveLength(100);
});
