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
// One hazard shapes the registry's sharing model:
//
// - **Module-graph duplication.** eve's dev runtime rebuilds authored artifacts
//   mid-session (e.g. the agent itself touches a watched file), and a rebuild
//   gives statically-exported tools a fresh module graph while session-scoped
//   dynamics (the tasks toolset, built on `session.started`) keep their old
//   closure. Two module instances then hold two `Map`s: `bash` spawns a task
//   into one, `await_task` looks it up in the other — "No such task". So
//   registries are deduped per `storePath` on `globalThis` (via `Symbol.for`,
//   which is shared across module copies): every same-ABI copy in the process
//   converges on one instance. ABI-changing reloads use a new key and fail
//   closed instead of calling an old registry through a new interface.

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";

const TASK_ID_PATTERN = /^task_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TASK_STORE_VERSION = 2;

/** Schema for an opaque background-task id backed by a UUID. */
export const TaskIdSchema = z.string().regex(TASK_ID_PATTERN).brand<"TaskId">();

/** Opaque id returned by {@link TaskRegistry.spawnTask}. */
export type TaskId = z.infer<typeof TaskIdSchema>;

/** Parse an untrusted model- or store-provided task id. */
export function parseTaskId(value: unknown): TaskId | null {
  const parsed = TaskIdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Session authorization required for every background-task operation. */
export interface TaskScope {
  readonly kind: "session";
  readonly sessionId: string;
}

const TaskScopeSchema: z.ZodType<TaskScope> = z.object({
  kind: z.literal("session"),
  sessionId: z.string().min(1),
});

/**
 * Build the mandatory task scope for an Eve tool call. Missing session
 * context fails closed before work starts or task state is read.
 */
export function taskScopeForSession(sessionId: string | undefined): TaskScope {
  if (sessionId === undefined || sessionId.length === 0) {
    throw new Error(
      "Background task tools require an active session. Nothing was started or read; retry from an active Eve session.",
    );
  }
  return { kind: "session", sessionId };
}

/** Fields every task carries regardless of status — see `Task`. */
export interface BaseTask {
  readonly id: TaskId;
  /** Short human label, e.g. the command or query. */
  readonly label: string;
  /** Which backgroundable op produced this task. */
  readonly tool: string;
  /** Session authorization that owns this task and every read of it. */
  readonly scope: TaskScope;
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
  spawnTask(scope: TaskScope, tool: string, label: string, work: Promise<unknown>): TaskId;
  /**
   * Update an owned running task's progress field. Foreign, settled, and
   * unknown tasks are indistinguishable no-ops.
   */
  updateTaskProgress(scope: TaskScope, id: TaskId, progress: unknown): void;
  /** List the calling session's tasks sorted by start time. */
  listTasks(scope: TaskScope): Task[];
  /** Retrieve an owned task by id; undefined for foreign or unknown ids. */
  getTask(scope: TaskScope, id: TaskId): Task | undefined;
  /**
   * Block until the task settles or `waitMs` elapses, then return its current
   * state (still "running" if the wait timed out). Foreign and unknown ids
   * both return undefined.
   */
  awaitTask(
    scope: TaskScope,
    id: TaskId,
    waitMs: number,
    abortSignal?: AbortSignal,
  ): Promise<Task | undefined>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTask(value: unknown): value is Task {
  if (!isRecord(value)) return false;
  if (
    parseTaskId(value.id) === null ||
    typeof value.tool !== "string" ||
    typeof value.label !== "string" ||
    typeof value.startedAt !== "number" ||
    typeof value.status !== "string"
  ) {
    return false;
  }
  if (!TaskScopeSchema.safeParse(value.scope).success) return false;
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

// Bound completed history without discarding work that is still running.
const MAX_SETTLED_TASKS = 100;

// One registry per store path and ABI per process, no matter how many
// same-ABI module copies a runtime rebuild creates. `Symbol.for` is
// process-global, so every compatible copy resolves the same key.
// The ABI suffix matters during a hot reload: an older module graph can remain
// alive in the same process, but its registry methods accept different
// arguments. Never return that object through this interface.
const REGISTRY_CACHE_KEY = Symbol.for(
  `zocomputer.agent-sdk.task-registries.v${TASK_STORE_VERSION}`,
);

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

/**
 * Create a task registry backed by a JSON store. Registries are deduped per
 * `storePath` and ABI on `globalThis` so compatible module copies (across
 * rebuilds or static vs dynamic exports) converge on one instance.
 */
export function createTaskRegistry(opts: {
  /** JSON persistence path owned by the caller. */
  storePath: string;
  /** Test seam for deterministic ids; production uses `crypto.randomUUID`. */
  newTaskId?: (() => string) | undefined;
}): TaskRegistry {
  const cache = registryCache();
  const cached = cache.get(opts.storePath);
  if (cached) return cached;
  const registry = buildTaskRegistry(opts);
  cache.set(opts.storePath, registry);
  return registry;
}

function buildTaskRegistry(opts: {
  storePath: string;
  newTaskId?: (() => string) | undefined;
}): TaskRegistry {
  const { storePath } = opts;
  const tasks = new Map<TaskId, Task>();
  const pending = new Map<TaskId, Promise<unknown>>();
  const activeWaiters = new Map<TaskId, number>();
  const newTaskId = opts.newTaskId ?? (() => `task_${randomUUID()}`);

  function sameScope(left: TaskScope, right: TaskScope): boolean {
    return left.kind === right.kind && left.sessionId === right.sessionId;
  }

  function canAccess(scope: TaskScope, task: Task): boolean {
    return sameScope(scope, task.scope);
  }

  function allTasks(): Task[] {
    return [...tasks.values()].sort((a, b) => a.startedAt - b.startedAt);
  }

  function listTasks(scope: TaskScope): Task[] {
    return allTasks().filter((task) => canAccess(scope, task));
  }

  function persist(): void {
    mkdirSync(dirname(storePath), { recursive: true, mode: 0o700 });
    writeFileSync(
      storePath,
      JSON.stringify(
        { version: TASK_STORE_VERSION, scopedTasks: allTasks() },
        null,
        2,
      ),
      { encoding: "utf8", mode: 0o600 },
    );
  }

  function readStoreTasks(): Task[] {
    if (!existsSync(storePath)) return [];
    try {
      const parsed: unknown = JSON.parse(readFileSync(storePath, "utf8"));
      if (
        !isRecord(parsed) ||
        parsed.version !== TASK_STORE_VERSION ||
        !Array.isArray(parsed.scopedTasks)
      ) {
        return [];
      }
      return parsed.scopedTasks.filter(isTask);
    } catch {
      // Corrupt local state should not stop the agent from booting.
      return [];
    }
  }

  function loadPersisted(): void {
    let convertedRunningTask = false;
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
      if (saved.status === "running") convertedRunningTask = true;
      tasks.set(task.id, task);
    }
    const pruned = pruneSettledTasks();
    if (convertedRunningTask || pruned) persist();
  }

  loadPersisted();

  function pruneSettledTasks(): boolean {
    const settled = [...tasks.values()]
      .filter((task) => task.status !== "running" && !activeWaiters.has(task.id))
      .sort((a, b) => a.startedAt - b.startedAt);
    let excess = settled.length - MAX_SETTLED_TASKS;
    let pruned = false;
    for (const task of settled) {
      if (excess <= 0) break;
      tasks.delete(task.id);
      pending.delete(task.id);
      excess -= 1;
      pruned = true;
    }
    return pruned;
  }

  function nextTaskId(): TaskId {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const id = parseTaskId(newTaskId());
      if (id === null) {
        throw new Error("newTaskId must return task_<uuid>.");
      }
      if (!tasks.has(id)) return id;
    }
    throw new Error("Unable to allocate a unique background task id.");
  }

  // Attaches its own then/catch, so a rejecting op updates the task instead of
  // surfacing as an unhandledRejection.
  function spawnTask(
    scope: TaskScope,
    tool: string,
    label: string,
    work: Promise<unknown>,
  ): TaskId {
    const id = nextTaskId();
    const startedAt = Date.now();
    tasks.set(id, { id, tool, label, scope, startedAt, status: "running" });
    pending.set(id, work);
    void work.then(
      (result) => {
        tasks.set(id, {
          id,
          tool,
          label,
          scope,
          startedAt,
          status: "done",
          finishedAt: Date.now(),
          result,
        });
        pending.delete(id);
        pruneSettledTasks();
        persist();
      },
      (err: unknown) => {
        const error = err instanceof Error ? err.message : String(err);
        tasks.set(id, {
          id,
          tool,
          label,
          scope,
          startedAt,
          status: "error",
          finishedAt: Date.now(),
          error,
        });
        pending.delete(id);
        pruneSettledTasks();
        persist();
      },
    );
    pruneSettledTasks();
    persist();
    return id;
  }

  return {
    spawnTask,
    updateTaskProgress(scope, id, progress) {
      const task = tasks.get(id);
      if (!task || !canAccess(scope, task) || task.status !== "running") return;
      tasks.set(id, { ...task, progress });
    },
    listTasks,
    getTask(scope, id) {
      const task = tasks.get(id);
      return task && canAccess(scope, task) ? task : undefined;
    },
    async awaitTask(scope, id, waitMs, abortSignal) {
      const current = tasks.get(id);
      if (current) {
        if (!canAccess(scope, current)) return undefined;
        if (current.status !== "running") return current;
        const work = pending.get(id);
        if (work) {
          const wait = createWait(waitMs, abortSignal);
          activeWaiters.set(id, (activeWaiters.get(id) ?? 0) + 1);
          try {
            await Promise.race([
              work.then(
                () => undefined,
                () => undefined,
              ),
              wait.promise,
            ]);
            // Capture before finally releases the retention exemption. The
            // completed task may be the oldest result pruned immediately
            // afterward, but this active waiter must still receive it.
            return tasks.get(id);
          } finally {
            // If work wins, remove the timeout + abort listener immediately;
            // a later turn cancellation must not reject an orphaned waiter.
            wait.cancel();
            const waiterCount = activeWaiters.get(id) ?? 1;
            if (waiterCount === 1) activeWaiters.delete(id);
            else activeWaiters.set(id, waiterCount - 1);
            if (pruneSettledTasks()) persist();
          }
        }
        return tasks.get(id);
      }
      return undefined;
    },
  };
}
