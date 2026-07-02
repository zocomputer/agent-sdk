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

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

interface BaseTask {
  readonly id: string;
  /** Short human label, e.g. the command or query. */
  readonly label: string;
  /** Which backgroundable op produced this task. */
  readonly tool: string;
  readonly startedAt: number;
  readonly progress?: unknown;
}

// Discriminated union so callers can't read `result` off a still-running task.
export type Task =
  | (BaseTask & { readonly status: "running" })
  | (BaseTask & { readonly status: "done"; readonly finishedAt: number; readonly result: unknown })
  | (BaseTask & { readonly status: "error"; readonly finishedAt: number; readonly error: string })
  | (BaseTask & { readonly status: "lost"; readonly finishedAt: number; readonly error: string });

export interface TaskRegistry {
  /** Register `work` as a background task and return its id immediately. */
  spawnTask(tool: string, label: string, work: Promise<unknown>): string;
  updateTaskProgress(id: string, progress: unknown): void;
  listTasks(): Task[];
  getTask(id: string): Task | undefined;
  /**
   * Block until the task settles or `waitMs` elapses, then return its current
   * state (still "running" if the wait timed out). Undefined for an unknown id.
   */
  awaitTask(id: string, waitMs: number): Promise<Task | undefined>;
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

export function createTaskRegistry(opts: { storePath: string }): TaskRegistry {
  const { storePath } = opts;
  const tasks = new Map<string, Task>();
  const pending = new Map<string, Promise<unknown>>();
  let counter = 0;

  function listTasks(): Task[] {
    return [...tasks.values()].sort((a, b) => a.startedAt - b.startedAt);
  }

  function persist(): void {
    mkdirSync(dirname(storePath), { recursive: true });
    writeFileSync(storePath, JSON.stringify({ tasks: listTasks() }, null, 2), "utf8");
  }

  function loadPersisted(): void {
    if (!existsSync(storePath)) return;
    try {
      const parsed: unknown = JSON.parse(readFileSync(storePath, "utf8"));
      if (!isRecord(parsed) || !Array.isArray(parsed.tasks)) return;
      for (const saved of parsed.tasks) {
        if (!isTask(saved)) continue;
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
    } catch {
      // Corrupt local state should not stop the agent from booting.
    }
  }

  loadPersisted();

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
  function spawnTask(tool: string, label: string, work: Promise<unknown>): string {
    const id = `task_${++counter}`;
    const startedAt = Date.now();
    tasks.set(id, { id, tool, label, startedAt, status: "running" });
    pending.set(id, work);
    void work.then(
      (result) => {
        tasks.set(id, {
          id,
          tool,
          label,
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
      return tasks.get(id);
    },
    async awaitTask(id, waitMs) {
      const current = tasks.get(id);
      if (!current || current.status !== "running") return current;
      const work = pending.get(id);
      if (work) {
        await Promise.race([
          work.then(
            () => undefined,
            () => undefined,
          ),
          new Promise<void>((resolve) => setTimeout(resolve, waitMs)),
        ]);
      }
      return tasks.get(id);
    },
  };
}
