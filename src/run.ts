import { spawn } from "node:child_process";
import { join } from "node:path";
import { createBoundedCapture, type BoundedCapture } from "./bounded-output";
import type { Workspace } from "./workspace";

// Tool results enter the transcript permanently, so a full-run result is
// bounded to head + tail (see bounded-output.ts) with the complete output
// spilled to the runner's spill dir — the model greps/reads the spill instead
// of re-running the command. Live progress previews keep just the tail (the
// latest lines matter while it's still running).
export const MAX_PREVIEW = 20_000;

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
}

export interface RunProgress {
  stdout: string;
  stderr: string;
  stdoutBytes: number;
  stderrBytes: number;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
}

export interface RunningCommand {
  result: Promise<RunResult>;
  progress(): RunProgress;
  kill(): void;
}

export interface StartCommandOptions {
  cwd?: string;
  timeoutMs?: number;
  /**
   * Raw output tap, called with every stdout/stderr chunk as it arrives
   * (before any preview truncation). Powers background-output watchers.
   */
  onOutput?: (chunk: string) => void;
}

export interface CommandRunner {
  /** Spawn a shell command and return live handles (progress preview, kill, result). */
  startCommand(command: string, opts?: StartCommandOptions): RunningCommand;
  /** startCommand, awaited to completion. */
  runCommand(command: string, opts?: StartCommandOptions): Promise<RunResult>;
}

function previewOf(capture: BoundedCapture): string {
  const latest = capture.latest();
  if (capture.totalChars() <= MAX_PREVIEW) return latest;
  return `… [earlier output truncated]\n${latest.slice(-MAX_PREVIEW)}`;
}

// Commands run rooted at the workspace (cwd resolved within it — a real shell
// otherwise: no sandbox, no undo). Overflowing output spills to `spillDir`,
// labeled workspace-relative so the model can read/grep the file.
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
          stdout: previewOf(stdoutCapture),
          stderr: previewOf(stderrCapture),
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
