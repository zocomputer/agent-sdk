import { defineTool } from "eve/tools";
import { z } from "zod";
import type { TaskRegistry } from "../async-tasks";
import type { CommandRunner, CommandRunnerProvider } from "../run";
import type { IoToolContext } from "../workspace-io";

// Overrides eve's built-in `bash`. One tool, two exec environments behind the
// CommandRunner seam: the host runner (child_process on the harness machine,
// rooted at the workspace — git, package managers, tests act on the actual
// checkout) and the sandbox runner (commands inside the session's workspace
// sandbox — see ../sandbox-run.ts). Everything above the seam (foreground
// race, auto-backgrounding, and truncation) is identical.

// Appended to the description so the model doesn't launch full-screen CLIs in
// a piped shell. Agents with a real-terminal tool override it to point there
// (see the composed toolset's `bashInteractiveHint`).
const DEFAULT_INTERACTIVE_HINT =
  "This is a piped shell with NO tty: avoid interactive or full-screen CLIs (a REPL, vim, an interactive installer/prompt) — those programs hang or degrade without a real terminal.";

function abortReason(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) return signal.reason;
  return new DOMException("The tool call was cancelled", "AbortError");
}

/**
 * Where the bash tool's commands execute. Wording only — the actual backend
 * is whatever `runner` does; this keeps the description honest about it.
 */
export type BashExecEnv = "host" | "sandbox";

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
}) {
  const { workdir, registry, noun } = opts;
  const execEnv = opts.execEnv ?? "host";
  const interactiveHint = opts.interactiveHint ?? DEFAULT_INTERACTIVE_HINT;
  const resolveRunner = (ctx: IoToolContext | undefined): CommandRunner =>
    typeof opts.runner === "function" ? opts.runner(ctx) : opts.runner;

  const description = [
    execEnv === "sandbox"
      ? `Run a shell command inside the session's workspace sandbox, from the ${noun} root by default.`
      : `Run a shell command on the host, from the ${noun} root by default.`,
    "Quick commands return normally. If the command is still running after foreground_ms, it keeps running in the background and returns a task_id plus current stdout/stderr; use check_tasks and await_task to monitor or collect the result.",
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
    },
    ctx: IoToolContext | undefined,
  ) {
    const { command, cwd, timeout_ms, foreground_ms } = args;
    const runner = resolveRunner(ctx);
    const running = runner.startCommand(command, {
      cwd,
      timeoutMs: timeout_ms ?? 600_000,
    });
    const signal = ctx?.abortSignal;
    const result = await new Promise<Awaited<typeof running.result> | null>((resolve, reject) => {
      let settled = false;
      let removeAbortListener = () => {};
      const foregroundTimer = setTimeout(() => {
        if (settled) return;
        settled = true;
        removeAbortListener();
        resolve(null);
      }, foreground_ms ?? 2_000);
      const settle = () => {
        if (settled) return false;
        settled = true;
        clearTimeout(foregroundTimer);
        removeAbortListener();
        return true;
      };
      const onAbort = (abortedSignal: AbortSignal) => {
        if (!settle()) return;
        running.kill();
        reject(abortReason(abortedSignal));
      };
      if (signal !== undefined) {
        if (signal.aborted) {
          onAbort(signal);
        } else {
          const handleAbort = () => onAbort(signal);
          signal.addEventListener("abort", handleAbort, { once: true });
          removeAbortListener = () => signal.removeEventListener("abort", handleAbort);
        }
      }
      void running.result.then(
        (completed) => {
          if (settle()) resolve(completed);
        },
        (error: unknown) => {
          if (settle()) reject(error);
        },
      );
    });
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
    return {
      workdir,
      mode: "backgrounded" as const,
      task_id: taskId,
      status: "running" as const,
      progress: running.progress(),
      note: "Command is still running in the background. Continue independent work, then call check_tasks for live output or await_task when you need the final result.",
    };
  }

  return defineTool({
    description,
    inputSchema: z.object(baseParams),
    execute: (args, ctx) => runBash(args, ctx),
  });
}
