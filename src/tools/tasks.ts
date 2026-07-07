import { defineDynamic, defineTool } from "eve/tools";
import { z } from "zod";
import type { Task, TaskRegistry } from "../async-tasks";
import type { BackgroundableOp } from "../backgroundable";
import { postParkNotification } from "../park-delivery";
import { createSteerWrapper, type SteerSource } from "../steer-tool";
import {
  createOutputWatcher,
  formatCompletionNotification,
  formatWatchNotification,
} from "../watch-output";

// Async tools over the task registry. eve blocks a step until every tool call
// resolves, so run_async launches backgroundable work and returns a task id
// immediately; check_tasks peeks at progress; await_task blocks for the result
// when the agent's next step depends on it. The workflow guidance is injected
// as a dynamic instruction (createParallelToolsInstruction).

const DEFAULT_WAIT_MS = 120_000;

function elapsedMs(task: Task): number {
  const end = task.status === "running" ? Date.now() : task.finishedAt;
  return end - task.startedAt;
}

// Compact, non-blocking view for check_tasks — status and timing, no output.
// The id key is `task_id` to match run_async's return and await_task's param.
function peek(task: Task) {
  return {
    task_id: task.id,
    tool: task.tool,
    label: task.label,
    status: task.status,
    elapsedMs: elapsedMs(task),
    ...(task.progress !== undefined ? { progress: task.progress } : {}),
    ...(task.status === "error" || task.status === "lost" ? { error: task.error } : {}),
  };
}

// Full view for await_task, including the op's result (or error).
function full(task: Task) {
  const base = {
    task_id: task.id,
    tool: task.tool,
    label: task.label,
    status: task.status,
    elapsedMs: elapsedMs(task),
  };
  if (task.status === "done") return { ...base, result: task.result };
  if (task.status === "error" || task.status === "lost") return { ...base, error: task.error };
  return { ...base, ...(task.progress !== undefined ? { progress: task.progress } : {}) };
}

/**
 * Build the `{run_async, check_tasks, await_task}` toolset. Exported with its
 * concrete types for direct testing; agents wire it through createTasksTools
 * (a `defineDynamic` erases entry types on the wire-facing surface).
 */
export function buildTasksToolset(opts: {
  registry: TaskRegistry;
  backgroundables: readonly BackgroundableOp[];
  /** When set, steered messages ride these tools' results (see ../steer-tool). */
  steerInbox?: SteerSource | null;
}) {
  const { registry, backgroundables } = opts;
  const [firstOp, ...restOps] = backgroundables;
  if (!firstOp) return null;
  const toolNames: [string, ...string[]] = [firstOp.name, ...restOps.map((o) => o.name)];
  const catalog = backgroundables
    .map((o) => `- ${o.name}: ${o.description}\n  input: ${JSON.stringify(o.inputJsonSchema)}`)
    .join("\n");
  // await_task is the highest-value steer window: it's where the agent blocks
  // on long work, exactly when a user most wants to redirect.
  const wrap = createSteerWrapper(opts.steerInbox ?? null);

  return {
    run_async: wrap(defineTool({
      description:
        "Start a tool running in the BACKGROUND and return immediately with a task id, instead of blocking until it finishes. Use it for long work whose result your next step doesn't need yet (tests, builds, installs) so you can keep working in parallel; poll with check_tasks and collect the result with await_task. If your very next step needs the output, just call the tool directly instead. For work where you only care about a specific output signal, pass notify — matching lines are delivered to you as a message while you're idle, instead of you polling.\n\nBackgroundable tools (pass `input` matching the tool's own schema):\n" +
        catalog,
      inputSchema: z.object({
        tool: z.enum(toolNames).describe("Which backgroundable tool to run."),
        input: z
          .record(z.string(), z.unknown())
          .describe("Arguments for that tool — the same object you'd pass calling it directly."),
        notify: z
          .object({
            pattern: z
              .string()
              .min(1)
              .describe("Regex matched against complete output lines."),
            reason: z
              .string()
              .min(1)
              .describe("Short phrase naming what you're watching for, e.g. 'build errors'."),
            debounce_ms: z
              .number()
              .int()
              .positive()
              .optional()
              .describe("Minimum ms between match notifications (default 5000)."),
          })
          .optional()
          .describe(
            "Watch the task's output: matching lines are delivered to you as a message while you're idle.",
          ),
        notify_on_complete: z
          .boolean()
          .optional()
          .describe(
            "Also deliver a message when the task settles (default false; await_task remains the primary way to collect results).",
          ),
      }),
      execute({ tool, input, notify, notify_on_complete }, ctx) {
        const op = backgroundables.find((o) => o.name === tool);
        if (!op) throw new Error(`Unknown backgroundable tool: ${tool}`);
        const sessionId = ctx?.session?.id;
        // Built before start() so an invalid regex fails as a normal tool
        // error instead of after the work is already running.
        const watcher = notify
          ? createOutputWatcher({ pattern: notify.pattern, debounceMs: notify.debounce_ms })
          : null;
        // The task id doesn't exist until after start(), so watcher posts
        // buffer through this indirection until it's known.
        let post: ((lines: readonly string[] | null) => void) | null = null;
        const early: (readonly string[])[] = [];
        // start() parses input against the op's schema and throws on bad input,
        // so we validate before registering a task.
        const { label, work, progress } = op.start(
          input,
          watcher
            ? {
                onOutput: (chunk) => {
                  const matches = watcher.feed(chunk);
                  if (!matches) return;
                  if (post) post(matches);
                  else early.push(matches);
                },
              }
            : undefined,
        );
        const taskId = registry.spawnTask(tool, label, work);
        if (watcher && notify && sessionId) {
          let matchCount = 0;
          post = (lines) => {
            if (!lines || lines.length === 0) return;
            matchCount += 1;
            postParkNotification(sessionId, {
              key: `${taskId}#watch${matchCount}`,
              text: formatWatchNotification({ taskId, label, reason: notify.reason, lines }),
            });
          };
          for (const batch of early.splice(0)) post(batch);
          void work.finally(() => post?.(watcher.flush())).catch(() => undefined);
        }
        if (notify_on_complete && sessionId) {
          void work.then(
            () =>
              postParkNotification(sessionId, {
                key: `${taskId}#done`,
                text: formatCompletionNotification({ taskId, label, status: "done" }),
              }),
            (err: unknown) =>
              postParkNotification(sessionId, {
                key: `${taskId}#done`,
                text: formatCompletionNotification({
                  taskId,
                  label,
                  status: "error",
                  error: err instanceof Error ? err.message : String(err),
                }),
              }),
          );
        }
        if (progress) {
          registry.updateTaskProgress(taskId, progress());
          const interval = setInterval(() => registry.updateTaskProgress(taskId, progress()), 500);
          void work.finally(() => clearInterval(interval)).catch(() => undefined);
        }
        return {
          task_id: taskId,
          tool,
          status: "running" as const,
          ...(watcher ? { watching: notify?.pattern } : {}),
          note: "Started in the background. If your next actions don't depend on this, keep working and call check_tasks / await_task later; otherwise call await_task now.",
        };
      },
    })),

    check_tasks: wrap(defineTool({
      description:
        "List background tasks and their status without blocking; returns `runningCount` plus the task list. For tasks that support progress (notably bash), includes a live stdout/stderr preview. Call await_task to collect a task's final result.",
      inputSchema: z.object({}),
      execute() {
        const tasks = registry.listTasks().map(peek);
        return { runningCount: tasks.filter((t) => t.status === "running").length, tasks };
      },
    })),

    await_task: wrap(defineTool({
      description:
        "Block until a background task finishes (up to wait_ms), then return its full result. Use it when your next step needs the task's final output. If the wait elapses while it's still running, returns the running status plus any live progress so you can decide to keep waiting or move on.",
      inputSchema: z.object({
        task_id: z
          .string()
          .min(1)
          .describe("Task id returned by run_async or a backgrounded bash call."),
        wait_ms: z
          .number()
          .int()
          .positive()
          .optional()
          .describe(`Max time to block in ms (default ${DEFAULT_WAIT_MS}).`),
      }),
      async execute({ task_id, wait_ms }) {
        const task = await registry.awaitTask(task_id, wait_ms ?? DEFAULT_WAIT_MS);
        if (!task) throw new Error(`No such task: ${task_id}`);
        return full(task);
      },
    })),
  };
}

/**
 * The toolset as one dynamic definition. Session-scoped on purpose: tool
 * definitions sit in the model's cached prompt prefix, so the run_async
 * catalog is built once per session and stays byte-identical thereafter —
 * live task state rides check_tasks' RESULT, never a description.
 */
export function createTasksTools(opts: {
  registry: TaskRegistry;
  backgroundables: readonly BackgroundableOp[];
  /** When set, steered messages ride these tools' results (see ../steer-tool). */
  steerInbox?: SteerSource | null;
}) {
  return defineDynamic({
    events: {
      "session.started": () => buildTasksToolset(opts),
    },
  });
}
