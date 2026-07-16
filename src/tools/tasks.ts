import { defineDynamic, defineTool } from "eve/tools";
import { z } from "zod";
import {
  parseTaskId,
  taskScopeForSession,
  type Task,
  type TaskRegistry,
} from "../async-tasks";
import type { BackgroundableOp } from "../backgroundable";
import type { IoToolContext } from "../workspace-io";

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
}) {
  const { registry, backgroundables } = opts;
  const [firstOp, ...restOps] = backgroundables;
  if (!firstOp) return null;
  const toolNames: [string, ...string[]] = [firstOp.name, ...restOps.map((o) => o.name)];
  const catalog = backgroundables
    .map((o) => `- ${o.name}: ${o.description}\n  input: ${JSON.stringify(o.inputJsonSchema)}`)
    .join("\n");
  const runAsyncDescription =
    "Start a tool running in the BACKGROUND and return immediately with a task id, instead of blocking until it finishes. Use it for long work whose result your next step doesn't need yet (tests, builds, installs) so you can keep working in parallel; poll with check_tasks and collect the result with await_task. If your very next step needs the output, just call the tool directly instead." +
    "\n\nBackgroundable tools (pass `input` matching the tool's own schema):\n" +
    catalog;

  const runAsyncBaseParams = {
    tool: z.enum(toolNames).describe("Which backgroundable tool to run."),
    input: z
      .record(z.string(), z.unknown())
      .describe("Arguments for that tool — the same object you'd pass calling it directly."),
  };
  function startAsync(
    args: {
      tool: string;
      input: Record<string, unknown>;
    },
    ctx: IoToolContext | undefined,
  ) {
    const { tool, input } = args;
    const scope = taskScopeForSession(ctx?.session?.id);
    const op = backgroundables.find((o) => o.name === tool);
    if (!op) throw new Error(`Unknown backgroundable tool: ${tool}`);
    // start() parses input against the op's schema and throws on bad input,
    // so we validate before registering a task.
    const { label, work, progress } = op.start(input, { ctx });
    const taskId = registry.spawnTask(scope, tool, label, work);
    if (progress) {
      registry.updateTaskProgress(scope, taskId, progress());
      const interval = setInterval(
        () => registry.updateTaskProgress(scope, taskId, progress()),
        500,
      );
      void work.finally(() => clearInterval(interval)).catch(() => undefined);
    }
    return {
      task_id: taskId,
      tool,
      status: "running" as const,
      note: "Started in the background. If your next actions don't depend on this, keep working and call check_tasks / await_task later; otherwise call await_task now.",
    };
  }

  const runAsync = defineTool({
    description: runAsyncDescription,
    inputSchema: z.object(runAsyncBaseParams),
    execute: (args, ctx) => startAsync(args, ctx),
  });

  return {
    run_async: runAsync,

    check_tasks: defineTool({
      description:
        "List background tasks and their status without blocking; returns `runningCount` plus the task list. For tasks that support progress (notably bash), includes a live stdout/stderr preview. Call await_task to collect a task's final result.",
      inputSchema: z.object({}),
      // Scoped to the calling session: on a shared warm instance another
      // session's tasks (labels carry full command lines) must not list here.
      execute(_args, ctx) {
        const scope = taskScopeForSession(ctx?.session?.id);
        const tasks = registry.listTasks(scope).map(peek);
        return { runningCount: tasks.filter((t) => t.status === "running").length, tasks };
      },
    }),

    await_task: defineTool({
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
      async execute({ task_id, wait_ms }, ctx) {
        const scope = taskScopeForSession(ctx?.session?.id);
        const parsedTaskId = parseTaskId(task_id);
        const task = parsedTaskId
          ? await registry.awaitTask(
              scope,
              parsedTaskId,
              wait_ms ?? DEFAULT_WAIT_MS,
              ctx?.abortSignal,
            )
          : undefined;
        if (!task) {
          throw new Error(
            `No such task: ${task_id}. Call check_tasks to list the current tasks and their ids, then resend with a real one.`,
          );
        }
        return full(task);
      },
    }),
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
}) {
  return defineDynamic({
    events: {
      "session.started": () => buildTasksToolset(opts),
    },
  });
}
