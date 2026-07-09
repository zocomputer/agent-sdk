import { spawn } from "node:child_process";
import { join } from "node:path";
import { createBoundedCapture, type BoundedCapture } from "./bounded-output";
import type { Workspace } from "./workspace";
import type { IoToolContext } from "./workspace-io";

/**
 * Character cap for live progress previews; the tail alone when output exceeds
 * it. Full-run results get head + tail instead (see bounded-output.ts).
 */
export const MAX_PREVIEW = 20_000;

/**
 * A completed command run: stdout/stderr (bounded head + tail when overflowing),
 * exit code (null if the spawn failed), and whether it timed out.
 */
export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
}

/**
 * Live progress snapshot while a command is still running: preview text
 * (tail-only when truncated), byte counts, and truncation flags.
 */
export interface RunProgress {
  stdout: string;
  stderr: string;
  stdoutBytes: number;
  stderrBytes: number;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
}

/**
 * A spawned command with live handles: the result promise, a progress snapshot
 * method, and a kill signal.
 */
export interface RunningCommand {
  result: Promise<RunResult>;
  /** Current progress snapshot (stdout/stderr previews, byte counts, truncation flags). */
  progress(): RunProgress;
  /** Kill the command's process group via SIGTERM; safe to call after it's already exited. */
  kill(): void;
}

/**
 * Options for starting a shell command: working directory, timeout, and an
 * optional raw-output tap called with every chunk before truncation.
 */
export interface StartCommandOptions {
  cwd?: string | undefined;
  timeoutMs?: number;
  /**
   * Raw output tap, called with every stdout/stderr chunk as it arrives
   * (before any preview truncation). Powers background-output watchers.
   */
  onOutput?: ((chunk: string) => void) | undefined;
}

/**
 * A workspace-rooted shell runner that spawns commands in detached process
 * groups and captures/spills their output.
 */
export interface CommandRunner {
  /** Spawn a shell command and return live handles (progress preview, kill, result). */
  startCommand(command: string, opts?: StartCommandOptions): RunningCommand;
  /** startCommand, awaited to completion. */
  runCommand(command: string, opts?: StartCommandOptions): Promise<RunResult>;
}

/**
 * Resolves the runner for one tool call — the exec twin of
 * `WorkspaceIoProvider`. A sandbox arrives per tool call (`ctx.getSandbox()`),
 * not per factory build, so exec tools that run against a remote backend hold
 * a provider and resolve it at the top of each execute. A plain
 * `CommandRunner` still works everywhere one is accepted (the local backend
 * has no per-call state).
 */
export type CommandRunnerProvider = (ctx: IoToolContext | undefined) => CommandRunner;

/**
 * Preview text for a live capture: the whole text within `MAX_PREVIEW`,
 * tail-only (with a leading marker) beyond it. Shared by every runner's
 * `progress()`.
 */
export function capturePreview(capture: BoundedCapture): string {
  const latest = capture.latest();
  if (capture.totalChars() <= MAX_PREVIEW) return latest;
  return `… [earlier output truncated]\n${latest.slice(-MAX_PREVIEW)}`;
}

/**
 * Create a command runner rooted at the workspace. Commands run in a real
 * shell (no sandbox), cwd resolves within the workspace, and overflowing
 * output spills to files under `spillDir` (labeled workspace-relative).
 */
export function createCommandRunner(opts: {
  workspace: Workspace;
  spillDir: string;
}): CommandRunner {
  const { workspace, spillDir } = opts;

  function startCommand(command: string, runOpts: StartCommandOptions = {}): RunningCommand {
    const cwd = runOpts.cwd ? workspace.resolve(runOpts.cwd) : workspace.root;
    const timeoutMs = runOpts.timeoutMs ?? 120_000;
    // detached: the shell gets its own process group, so kills can target the
    // whole tree — killing just the shell leaves grandchildren running AND
    // holding the stdio pipes, which stalls `close` (and the result promise)
    // until they exit on their own.
    const child = spawn(command, { cwd, shell: true, env: process.env, detached: true });
    // One spill file per stream per invocation; created only on overflow.
    const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const captureFor = (stream: "stdout" | "stderr"): BoundedCapture => {
      const spillPath = join(spillDir, `bash-${runId}-${stream}.log`);
      return createBoundedCapture({ spillPath, spillLabel: workspace.relativize(spillPath) });
    };
    const stdoutCapture = captureFor("stdout");
    const stderrCapture = captureFor("stderr");
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let timedOut = false;
    let closed = false;
    const killTree = (signal: NodeJS.Signals) => {
      const pid = child.pid;
      if (pid === undefined) return; // spawn failed; the "error" event resolves the result
      try {
        process.kill(-pid, signal); // negative pid = the detached process group
      } catch {
        child.kill(signal); // group already gone or not ours; fall back to the shell
      }
    };
    const timer = setTimeout(() => {
      timedOut = true;
      killTree("SIGKILL");
    }, timeoutMs);

    const result = new Promise<RunResult>((resolvePromise) => {
      child.stdout.on("data", (d: Buffer) => {
        const chunk = d.toString();
        stdoutBytes += Buffer.byteLength(chunk);
        stdoutCapture.append(chunk);
        runOpts.onOutput?.(chunk);
      });
      child.stderr.on("data", (d: Buffer) => {
        const chunk = d.toString();
        stderrBytes += Buffer.byteLength(chunk);
        stderrCapture.append(chunk);
        runOpts.onOutput?.(chunk);
      });
      child.on("close", (code) => {
        closed = true;
        clearTimeout(timer);
        resolvePromise({
          stdout: stdoutCapture.snapshot().text,
          stderr: stderrCapture.snapshot().text,
          exitCode: code,
          timedOut,
        });
      });
      child.on("error", (err: Error) => {
        closed = true;
        clearTimeout(timer);
        resolvePromise({
          stdout: stdoutCapture.snapshot().text,
          stderr: `${stderrCapture.snapshot().text}${err.message}`,
          exitCode: null,
          timedOut,
        });
      });
    });

    return {
      result,
      progress() {
        return {
          stdout: capturePreview(stdoutCapture),
          stderr: capturePreview(stderrCapture),
          stdoutBytes,
          stderrBytes,
          stdoutTruncated: stdoutCapture.totalChars() > MAX_PREVIEW,
          stderrTruncated: stderrCapture.totalChars() > MAX_PREVIEW,
        };
      },
      kill() {
        if (closed) return;
        killTree("SIGTERM");
      },
    };
  }

  return {
    startCommand,
    runCommand: (command, runOpts) => startCommand(command, runOpts).result,
  };
}
