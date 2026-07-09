import { defineTool } from "eve/tools";
import { z } from "zod";
import type { TaskRegistry } from "../async-tasks";
import { postParkNotification } from "../park-delivery";
import type { CommandRunner, CommandRunnerProvider } from "../run";
import { createOutputWatcher, formatWatchNotification } from "../watch-output";
import type { IoToolContext } from "../workspace-io";

// Overrides eve's built-in `bash`. One tool, two exec environments behind the
// CommandRunner seam: the host runner (child_process on the harness machine,
// rooted at the workspace — git, package managers, tests act on the actual
// checkout) and the sandbox runner (commands inside the session's workspace
// sandbox — see ../sandbox-run.ts). Everything above the seam (foreground
// race, auto-backgrounding, notify watchers, truncation) is identical.

// Appended to the description so the model doesn't launch full-screen CLIs in
// a piped shell. Agents with a real-terminal tool override it to point there
// (see createStdlib's `bashInteractiveHint`).
const DEFAULT_INTERACTIVE_HINT =
  "This is a piped shell with NO tty: avoid interactive or full-screen CLIs (a REPL, vim, an interactive installer/prompt) — those programs hang or degrade without a real terminal.";

/**
 * Where the bash tool's commands execute. Wording only — the actual backend
 * is whatever `runner` does; this keeps the description honest about it.
 */
export type BashExecEnv = "host" | "sandbox";

const notifyParam = z
  .object({
    pattern: z
      .string()
      .min(1)
      .describe("Regex matched against complete output lines (stdout and stderr)."),
    reason: z
      .string()
      .min(1)
      .describe("Short phrase naming what you're watching for, e.g. 'test failures'."),
    debounce_ms: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Minimum ms between match notifications (default 5000)."),
  })
  .optional()
  .describe(
    "Watch the command's output if it backgrounds: matching lines are delivered to you as a message while you're idle. No effect on a command that completes in the foreground.",
  );

type NotifyInput = z.infer<typeof notifyParam>;

/** Build the bash tool: a real shell through the given runner (host or sandbox), rooted at the workspace. */
export function createBashTool(opts: {
  /** Absolute workspace root, reported as `workdir` in results. */
  workdir: string;
  /** The exec backend, or a provider resolved from the tool context per call (the sandbox backend). */
  runner: CommandRunner | CommandRunnerProvider;
  registry: TaskRegistry;
  noun: string;
  interactiveHint?: string | undefined;
  /** Which environment commands execute in; picks the description's intro and caution wording. Default "host". */
  execEnv?: BashExecEnv | undefined;
  /**
   * Advertise + wire `notify` watchers (default true). Set false for agents
   * with no park-delivery handler registered, where a watcher would be a
   * false promise: notifications would queue but never reach the model.
   */
  notifications?: boolean | undefined;
}) {
  const { workdir, registry, noun } = opts;
  const execEnv = opts.execEnv ?? "host";
  const notifications = opts.notifications ?? true;
  const interactiveHint = opts.interactiveHint ?? DEFAULT_INTERACTIVE_HINT;
  const resolveRunner = (ctx: IoToolContext | undefined): CommandRunner =>
    typeof opts.runner === "function" ? opts.runner(ctx) : opts.runner;

  const description = [
    execEnv === "sandbox"
      ? `Run a shell command inside the session's workspace sandbox, from the ${noun} root by default.`
      : `Run a shell command on the host, from the ${noun} root by default.`,
    "Quick commands return normally. If the command is still running after foreground_ms, it keeps running in the background and returns a task_id plus current stdout/stderr; use check_tasks and await_task to monitor or collect the result.",
    ...(notifications
      ? [
          'For a long-running command where you only care about a specific output signal (a failure line, a "listening on" banner), pass notify — if the command backgrounds, matching output is delivered to you as a message while you\'re idle, so you can keep working instead of polling.',
        ]
      : []),
    "Use it for git, tests/builds/type-checks, ripgrep, dev servers, and anything the file tools don't cover. Very long output is truncated to its head and tail; the complete output is saved to a file named in the result — grep or read that file instead of re-running the command.",
    execEnv === "sandbox"
      ? "This is a real shell inside the workspace sandbox with no undo — be careful with destructive commands."
      : "This is a real shell on the user's machine with no sandbox and no undo — be careful with destructive commands.",
    interactiveHint,
  ].join(" ");

  const baseParams = {
    command: z.string().min(1).describe("The shell command to run."),
    cwd: z
      .string()
      .optional()
      .describe(`Working directory, relative to the ${noun} root. Defaults to the ${noun} root.`),
    timeout_ms: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Kill the command after this many milliseconds (default 600000)."),
    foreground_ms: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("How long to wait before returning a background task handle (default 2000)."),
  };

  async function runBash(
    args: {
      command: string;
      cwd?: string | undefined;
      timeout_ms?: number | undefined;
      foreground_ms?: number | undefined;
      notify?: NotifyInput;
    },
    ctx: IoToolContext | undefined,
  ) {
    const { command, cwd, timeout_ms, foreground_ms, notify } = args;
    const runner = resolveRunner(ctx);
    // Built before spawn so an invalid regex fails as a normal tool error;
    // chunks buffer until we know whether the command backgrounds (a
    // foreground completion needs no notification — its result returns).
    const watcher = notify
      ? createOutputWatcher({ pattern: notify.pattern, debounceMs: notify.debounce_ms })
      : null;
    let feedLive: ((chunk: string) => void) | null = null;
    const buffered: string[] = [];
    const running = runner.startCommand(command, {
      cwd,
      timeoutMs: timeout_ms ?? 600_000,
      onOutput: watcher
        ? (chunk) => {
            if (feedLive) feedLive(chunk);
            else buffered.push(chunk);
          }
        : undefined,
    });
    const result = await Promise.race([
      running.result,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), foreground_ms ?? 2_000)),
    ]);
    if (result !== null) {
      return {
        workdir,
        mode: "completed" as const,
        exitCode: result.exitCode,
        timedOut: result.timedOut,
        stdout: result.stdout,
        stderr: result.stderr,
      };
    }
    const taskId = registry.spawnTask("bash", command, running.result, ctx?.session?.id);
    registry.updateTaskProgress(taskId, running.progress());
    const interval = setInterval(() => registry.updateTaskProgress(taskId, running.progress()), 500);
    void running.result.finally(() => clearInterval(interval)).catch(() => undefined);
    if (watcher && notify) {
      const sessionId = ctx?.session?.id;
      let matchCount = 0;
      const post = (lines: readonly string[] | null) => {
        if (!lines || !sessionId) return;
        matchCount += 1;
        postParkNotification(sessionId, {
          key: `${taskId}#watch${matchCount}`,
          text: formatWatchNotification({ taskId, label: command, reason: notify.reason, lines }),
        });
      };
      feedLive = (chunk) => post(watcher.feed(chunk));
      for (const chunk of buffered.splice(0)) feedLive(chunk);
      void running.result
        .finally(() => post(watcher.flush()))
        .catch(() => undefined);
    }
    return {
      workdir,
      mode: "backgrounded" as const,
      task_id: taskId,
      status: "running" as const,
      progress: running.progress(),
      ...(watcher
        ? {
            watching: notify?.pattern,
            note: "Command is still running in the background; matching output will be delivered to you as a message while you're idle. Continue independent work, or call await_task if your next step needs the result.",
          }
        : {
            note: "Command is still running in the background. Continue independent work, then call check_tasks for live output or await_task when you need the final result.",
          }),
    };
  }

  // Two schema variants so the wire schema stays honest: with notifications
  // off, `notify` isn't a parameter at all — not an accepted-and-ignored one.
  if (!notifications) {
    return defineTool({
      description,
      inputSchema: z.object(baseParams),
      execute: (args, ctx) => runBash(args, ctx),
    });
  }
  return defineTool({
    description,
    inputSchema: z.object({ ...baseParams, notify: notifyParam }),
    execute: (args, ctx) => runBash(args, ctx),
  });
}
