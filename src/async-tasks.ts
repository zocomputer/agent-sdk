// Background task registry for the stdlib's async tools.
//
// eve runs each turn as a durable, step-checkpointed workflow, and a step can't
// advance until every tool call in it resolves — so there's no native "return
// early and keep running". Instead a tool kicks off work, stashes the promise
// here, and returns a task id immediately; later tools poll or await it.
//
// Task metadata/results are persisted to `storePath` so finished work survives
// an agent restart. In-flight JS promises cannot be reattached after a process
// exits, so tasks that were still running at boot are marked `lost`.
//
// Two hazards shape the registry's sharing model:
//
// - **Module-graph duplication.** eve's dev runtime rebuilds authored artifacts
//   mid-session (e.g. the agent itself touches a watched file), and a rebuild
//   gives statically-exported tools a fresh module graph while session-scoped
//   dynamics (the tasks toolset, built on `session.started`) keep their old
//   closure. Two module instances then hold two `Map`s: `bash` spawns `task_1`
//   into one, `await_task` looks it up in the other — "No such task". So
//   registries are deduped per `storePath` on `globalThis` (via `Symbol.for`,
//   which is shared across module copies): every copy in the process converges
//   on one instance.
// - **Out-of-instance readers.** As a second line, lookups that miss in memory
//   fall back to the persisted store, and `awaitTask` polls it while the task
//   is running elsewhere — so even a reader in another process reports honest
//   state instead of "No such task".

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/** Fields every task carries regardless of status — see `Task`. */
export interface BaseTask {
  readonly id: string;
  /** Short human label, e.g. the command or query. */
  readonly label: string;
  /** Which backgroundable op produced this task. */
  readonly tool: string;
  /**
   * Session that spawned the task; scopes `listTasks`. Absent for tasks
   * spawned without a tool context (tests, direct registry use).
   */
  readonly sessionId?: string;
  readonly startedAt: number;
  readonly progress?: unknown;
}

/**
 * Discriminated task union: running (no result yet), done (settled with a
 * result), error (failed), or lost (was running when the agent restarted).
 */
export type Task =
  | (BaseTask & { readonly status: "running" })
  | (BaseTask & { readonly status: "done"; readonly finishedAt: number; readonly result: unknown })
  | (BaseTask & { readonly status: "error"; readonly finishedAt: number; readonly error: string })
  | (BaseTask & { readonly status: "lost"; readonly finishedAt: number; readonly error: string });

/**
 * Background task registry: spawn work and return an id immediately, list/get
 * task state, update progress, and await settlement with a timeout.
 */
export interface TaskRegistry {
  /** Register `work` as a background task and return its id immediately. */
  spawnTask(tool: string, label: string, work: Promise<unknown>, sessionId?: string): string;
  /** Update a running task's progress field; no-op when the task isn't running or doesn't exist. */
  updateTaskProgress(id: string, progress: unknown): void;
  /**
   * List tasks sorted by start time. With `sessionId`, only that session's
   * tasks (plus session-less ones) — a shared warm instance must not leak
   * other sessions' command lines into check_tasks. Lookups by id
   * (`getTask`/`awaitTask`) stay unscoped: a task id is an unguessable
   * capability the model got from its own run_async.
   */
  listTasks(sessionId?: string): Task[];
  /** Retrieve one task by id; undefined when not found. */
  getTask(id: string): Task | undefined;
  /**
   * Block until the task settles or `waitMs` elapses, then return its current
   * state (still "running" if the wait timed out). Undefined for an unknown id.
   */
  awaitTask(id: string, waitMs: number, abortSignal?: AbortSignal): Promise<Task | undefined>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTask(value: unknown): value is Task {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== "string" ||
    typeof value.tool !== "string" ||
    typeof value.label !== "string" ||
    typeof value.startedAt !== "number" ||
    typeof value.status !== "string"
  ) {
    return false;
  }
  if (value.sessionId !== undefined && typeof value.sessionId !== "string") return false;
  switch (value.status) {
    case "running":
      return true;
    case "done":
      return typeof value.finishedAt === "number" && "result" in value;
    case "error":
    case "lost":
      return typeof value.finishedAt === "number" && typeof value.error === "string";
    default:
      return false;
  }
}

// Keep a registry from growing without bound over a long session; drop the
// oldest already-settled tasks first (never a running one).
const MAX_TASKS = 100;

// One registry per store path per process, no matter how many module copies a
// runtime rebuild creates. `Symbol.for` is process-global, so every copy of
// this module resolves the same key.
const REGISTRY_CACHE_KEY = Symbol.for("zocomputer.agent-sdk.task-registries");

function registryCache(): Map<string, TaskRegistry> {
  const holder = globalThis as { [REGISTRY_CACHE_KEY]?: Map<string, TaskRegistry> };
  holder[REGISTRY_CACHE_KEY] ??= new Map();
  return holder[REGISTRY_CACHE_KEY];
}

/**
 * Test-only: drop the per-process registry dedupe so a test can simulate an
 * agent restart (a fresh registry over an existing store).
 */
export function __resetTaskRegistryCacheForTests(): void {
  registryCache().clear();
}

/** How often awaitTask re-reads the store for a task another instance owns. */
const STORE_POLL_MS = 500;

function abortReason(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) return signal.reason;
  return new DOMException("The tool call was cancelled", "AbortError");
}

interface WaitHandle {
  readonly promise: Promise<void>;
  cancel(): void;
}

function createWait(ms: number, abortSignal?: AbortSignal): WaitHandle {
  if (abortSignal === undefined) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const promise = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, ms);
    });
    return {
      promise,
      cancel() {
        if (timer !== undefined) clearTimeout(timer);
        timer = undefined;
      },
    };
  }
  if (abortSignal.aborted) {
    return {
      promise: Promise.reject(abortReason(abortSignal)),
      cancel() {},
    };
  }
  let cancel = () => {};
  const promise = new Promise<void>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      if (settled) return false;
      settled = true;
      clearTimeout(timer);
      abortSignal.removeEventListener("abort", onAbort);
      return true;
    };
    const onAbort = () => {
      if (!cleanup()) return;
      reject(abortReason(abortSignal));
    };
    const timer = setTimeout(() => {
      if (!cleanup()) return;
      resolve();
    }, ms);
    abortSignal.addEventListener("abort", onAbort, { once: true });
    cancel = () => {
      if (!cleanup()) return;
      resolve();
    };
  });
  return { promise, cancel: () => cancel() };
}

function waitFor(ms: number, abortSignal?: AbortSignal): Promise<void> {
  return createWait(ms, abortSignal).promise;
}

/**
 * Create a task registry backed by a JSON store. Registries are deduped per
 * `storePath` on `globalThis` so multiple module copies (across rebuilds or
 * static vs dynamic exports) converge on one instance.
 */
export function createTaskRegistry(opts: { storePath: string }): TaskRegistry {
  const cache = registryCache();
  const cached = cache.get(opts.storePath);
  if (cached) return cached;
  const registry = buildTaskRegistry(opts);
  cache.set(opts.storePath, registry);
  return registry;
}

function buildTaskRegistry(opts: { storePath: string }): TaskRegistry {
  const { storePath } = opts;
  const tasks = new Map<string, Task>();
  const pending = new Map<string, Promise<unknown>>();
  let counter = 0;

  function allTasks(): Task[] {
    return [...tasks.values()].sort((a, b) => a.startedAt - b.startedAt);
  }

  function listTasks(sessionId?: string): Task[] {
    const all = allTasks();
    if (sessionId === undefined) return all;
    return all.filter((t) => t.sessionId === undefined || t.sessionId === sessionId);
  }

  function persist(): void {
    mkdirSync(dirname(storePath), { recursive: true });
    writeFileSync(storePath, JSON.stringify({ tasks: allTasks() }, null, 2), "utf8");
  }

  function readStoreTasks(): Task[] {
    if (!existsSync(storePath)) return [];
    try {
      const parsed: unknown = JSON.parse(readFileSync(storePath, "utf8"));
      if (!isRecord(parsed) || !Array.isArray(parsed.tasks)) return [];
      return parsed.tasks.filter(isTask);
    } catch {
      // Corrupt local state should not stop the agent from booting.
      return [];
    }
  }

  function loadPersisted(): void {
    for (const saved of readStoreTasks()) {
      const task =
        saved.status === "running"
          ? {
              ...saved,
              status: "lost" as const,
              finishedAt: Date.now(),
              error: "The agent restarted before this background task finished.",
            }
          : saved;
      tasks.set(task.id, task);
      const match = task.id.match(/^task_(\d+)$/);
      const n = match ? Number(match[1]) : 0;
      if (Number.isFinite(n)) counter = Math.max(counter, n);
    }
  }

  loadPersisted();

  // Read-through for tasks this instance doesn't hold (an owner in another
  // process). Settled state in the store is authoritative; a "running" entry
  // is honest live state — its promise just isn't awaitable from here.
  function storeTask(id: string): Task | undefined {
    return readStoreTasks().find((task) => task.id === id);
  }

  function prune(): void {
    if (tasks.size <= MAX_TASKS) return;
    const settled = [...tasks.values()]
      .filter((t) => t.status !== "running")
      .sort((a, b) => a.startedAt - b.startedAt);
    for (const t of settled) {
      if (tasks.size <= MAX_TASKS) break;
      tasks.delete(t.id);
      pending.delete(t.id);
    }
    persist();
  }

  // Attaches its own then/catch, so a rejecting op updates the task instead of
  // surfacing as an unhandledRejection.
  function spawnTask(
    tool: string,
    label: string,
    work: Promise<unknown>,
    sessionId?: string,
  ): string {
    const id = `task_${++counter}`;
    const startedAt = Date.now();
    const scope = sessionId !== undefined ? { sessionId } : {};
    tasks.set(id, { id, tool, label, ...scope, startedAt, status: "running" });
    pending.set(id, work);
    void work.then(
      (result) => {
        tasks.set(id, {
          id,
          tool,
          label,
          ...scope,
          startedAt,
          status: "done",
          finishedAt: Date.now(),
          result,
        });
        pending.delete(id);
        persist();
      },
      (err: unknown) => {
        const error = err instanceof Error ? err.message : String(err);
        tasks.set(id, {
          id,
          tool,
          label,
          ...scope,
          startedAt,
          status: "error",
          finishedAt: Date.now(),
          error,
        });
        pending.delete(id);
        persist();
      },
    );
    prune();
    persist();
    return id;
  }

  return {
    spawnTask,
    updateTaskProgress(id, progress) {
      const task = tasks.get(id);
      if (!task || task.status !== "running") return;
      tasks.set(id, { ...task, progress });
    },
    listTasks,
    getTask(id) {
      return tasks.get(id) ?? storeTask(id);
    },
    async awaitTask(id, waitMs, abortSignal) {
      const current = tasks.get(id);
      if (current) {
        if (current.status !== "running") return current;
        const work = pending.get(id);
        if (work) {
          const wait = createWait(waitMs, abortSignal);
          try {
            await Promise.race([
              work.then(
                () => undefined,
                () => undefined,
              ),
              wait.promise,
            ]);
          } finally {
            // If work wins, remove the timeout + abort listener immediately;
            // a later turn cancellation must not reject an orphaned waiter.
            wait.cancel();
          }
        }
        return tasks.get(id);
      }
      // Not ours — poll the persisted store until the owning instance settles
      // it or the wait elapses (still returns honest "running" state then).
      const deadline = Date.now() + waitMs;
      for (;;) {
        const saved = storeTask(id);
        if (!saved || saved.status !== "running") return saved;
        const remaining = deadline - Date.now();
        if (remaining <= 0) return saved;
        await waitFor(Math.min(STORE_POLL_MS, remaining), abortSignal);
      }
    },
  };
}
