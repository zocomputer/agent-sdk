import {
  createBoundedCapture,
  renderTruncationMarker,
  type BoundedCapture,
} from "./bounded-output";
import {
  capturePreview,
  MAX_PREVIEW,
  type CommandRunner,
  type CommandRunnerProvider,
  type RunningCommand,
  type RunResult,
  type StartCommandOptions,
} from "./run";
import { relativizeWithin, resolveWithin } from "./workspace";
import type { IoToolContext, SandboxSessionLike } from "./workspace-io";

// The sandbox backend for the CommandRunner seam (see ./run.ts): the same
// bash/tasks tools, but commands execute inside an eve `SandboxSession` via
// its `spawn` primitive — for the hosted topology where the eve process (a
// Vercel Function) and the workspace (a Daytona VM behind SSH) are different
// machines, so `child_process.spawn` would run on the wrong machine entirely.
//
// The contract mirrors the local runner (foreground race, live progress
// previews, kill, head+tail truncation) with one structural difference in the
// spill: the local runner streams over-cap output to a host file as it
// arrives, but a remote write per chunk would be absurd, so this runner
// retains the full text in host memory (bounded — see MAX_SPILL_RETAIN_CHARS)
// and writes the spill file into the sandbox once, when the command settles.

/**
 * The structural slice of a spawned sandbox process the runner needs.
 * Matches eve's `SandboxProcess` (itself the AI SDK sandbox process shape):
 * byte streams for stdout/stderr, a wait for the exit code, and an
 * idempotent kill.
 */
export interface SandboxProcessLike {
  /** Bytes the process writes to standard output. */
  readonly stdout: ReadableStream<Uint8Array>;
  /** Bytes the process writes to standard error. */
  readonly stderr: ReadableStream<Uint8Array>;
  /** Resolves when the process exits, with its exit code. */
  wait(): PromiseLike<{ exitCode: number }>;
  /** Terminate the process. Idempotent. */
  kill(): PromiseLike<void>;
}

/**
 * A sandbox session that can spawn long-running processes — the file-tool
 * session slice plus `spawn`. Eve's `SandboxSession` satisfies it
 * structurally; `createSandboxRunner` narrows a plain `SandboxSessionLike`
 * to this at runtime and fails with a clear error when the backend can't
 * spawn.
 */
export interface SandboxExecSessionLike extends SandboxSessionLike {
  /** Spawn a shell command in the sandbox and return live process handles. */
  readonly spawn: (options: {
    command: string;
    workingDirectory?: string;
  }) => PromiseLike<SandboxProcessLike>;
}

/**
 * Host-memory retention cap per stream for the settle-time spill. Output
 * beyond this is no longer retained in full, so a truncated result renders
 * its marker without a spill label — honest "output truncated" with no
 * pointer beats a pointer to a partial file.
 */
export const MAX_SPILL_RETAIN_CHARS = 5 * 1024 * 1024;

// After the process exits, its streams normally close within milliseconds —
// but a killed process's transport can leave them open forever (observed on
// Linux: a SIGKILLed child's bridged stdio never emits end). The drain window
// bounds how long settle waits for trailing output after exit before
// cancelling the readers, so kill/timeout always produce a result.
const STREAM_DRAIN_GRACE_MS = 1_000;

/** Options for creating a sandbox-backed command runner provider. */
export interface SandboxRunnerOptions {
  /**
   * Absolute path of the workspace root **inside the sandbox**. Commands run
   * from here by default, and `cwd` resolves within it.
   */
  root: string;
  /**
   * Resolves the sandbox session for one tool call. Defaults to
   * `ctx.getSandbox()` — the eve session sandbox. Injectable for tests and
   * for callers that hold a session some other way (e.g. the Builder's
   * workspace bootstrap).
   */
  resolveSession?: (
    ctx: IoToolContext | undefined,
  ) => PromiseLike<SandboxSessionLike>;
  /**
   * Absolute directory **inside the sandbox** for spilled command output.
   * Omit to disable spilling (truncation markers then carry no file
   * pointer).
   */
  spillDir?: string | undefined;
}

function defaultResolveSession(
  ctx: IoToolContext | undefined,
): PromiseLike<SandboxSessionLike> {
  if (ctx === undefined) {
    throw new Error(
      "The sandbox bash tool needs an eve tool context (ctx.getSandbox); none was provided.",
    );
  }
  return ctx.getSandbox();
}

// Runtime narrow: SandboxSessionLike deliberately stays the minimal file-tool
// slice, so exec capability is checked here at the boundary instead of
// widening every file tool's session requirement.
function requireExecSession(session: SandboxSessionLike): SandboxExecSessionLike {
  const spawn = (session as { spawn?: unknown }).spawn;
  if (typeof spawn !== "function") {
    throw new Error(
      "This sandbox session does not support spawn(); the sandbox bash tool needs a spawn-capable session.",
    );
  }
  return session as SandboxExecSessionLike;
}

/**
 * A `CommandRunnerProvider` over the session sandbox — pass as the `runner`
 * option of `createBashTool`/`createBashOp` (or use `createSandboxFileTools`,
 * which wires the whole set).
 */
export function sandboxRunnerProvider(options: SandboxRunnerOptions): CommandRunnerProvider {
  const resolve = options.resolveSession ?? defaultResolveSession;
  return (ctx) =>
    createSandboxRunner({
      root: options.root,
      session: () => resolve(ctx),
      spillDir: options.spillDir,
    });
}

// Per-stream capture state: the bounded head+tail plus the full-text
// retention that feeds the settle-time spill write.
interface StreamState {
  capture: BoundedCapture;
  retained: string[];
  retainedChars: number;
  overCap: boolean;
  bytes: number;
}

/**
 * One call's command runner over a sandbox session. The session resolves
 * lazily on first command and is shared across the call's commands.
 */
export function createSandboxRunner(opts: {
  /** Absolute workspace root inside the sandbox. */
  root: string;
  /** Resolves the session; called once, lazily, on the first command. */
  session: () => PromiseLike<SandboxSessionLike>;
  /** Absolute spill directory inside the sandbox; omit to disable spilling. */
  spillDir?: string | undefined;
}): CommandRunner {
  const { root, spillDir } = opts;
  let resolved: Promise<SandboxExecSessionLike> | null = null;
  const session = (): Promise<SandboxExecSessionLike> => {
    resolved ??= Promise.resolve(opts.session()).then(requireExecSession);
    return resolved;
  };

  function startCommand(command: string, runOpts: StartCommandOptions = {}): RunningCommand {
    // Resolved synchronously so an escaping cwd fails the tool call the same
    // way the local runner does (workspace.resolve throws out of startCommand).
    const cwd = runOpts.cwd ? resolveWithin(root, runOpts.cwd) : root;
    const timeoutMs = runOpts.timeoutMs ?? 120_000;
    const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const retaining = spillDir !== undefined;

    const newStream = (): StreamState => ({
      capture: createBoundedCapture({}),
      retained: [],
      retainedChars: 0,
      overCap: !retaining,
      bytes: 0,
    });
    const stdoutState = newStream();
    const stderrState = newStream();

    const emit = (state: StreamState, text: string): void => {
      if (text.length === 0) return;
      state.capture.append(text);
      if (!state.overCap) {
        state.retainedChars += text.length;
        if (state.retainedChars > MAX_SPILL_RETAIN_CHARS) {
          state.overCap = true;
          state.retained.length = 0;
        } else {
          state.retained.push(text);
        }
      }
      runOpts.onOutput?.(text);
    };

    // Each stream gets its own decoder so multi-byte characters split across
    // chunks reassemble correctly per stream. Readers are collected so the
    // post-exit drain can cancel a stream that never closes. (Typed by the
    // one capability the drain uses: runtime reader types disagree on the
    // rest — Bun's global reader carries readMany, node's stream/web doesn't.)
    const readers: { cancel: () => PromiseLike<unknown> }[] = [];
    const pump = async (
      stream: ReadableStream<Uint8Array>,
      state: StreamState,
    ): Promise<void> => {
      const decoder = new TextDecoder();
      const reader = stream.getReader();
      readers.push(reader);
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        state.bytes += value.byteLength;
        emit(state, decoder.decode(value, { stream: true }));
      }
      emit(state, decoder.decode());
    };

    // Assemble the final bounded text. When truncated and the full output is
    // still retained, write it into the sandbox now (one write per stream,
    // only when needed) and point the marker at it; otherwise the snapshot's
    // own label-less marker stands.
    const settleText = async (
      state: StreamState,
      stream: "stdout" | "stderr",
      sb: SandboxExecSessionLike | null,
    ): Promise<string> => {
      const snap = state.capture.snapshot();
      if (!snap.truncated) return snap.text;
      if (spillDir === undefined || state.overCap || sb === null) return snap.text;
      const path = `${spillDir}/bash-${runId}-${stream}.log`;
      try {
        await sb.writeBinaryFile({
          path,
          content: new TextEncoder().encode(state.retained.join("")),
        });
      } catch {
        return snap.text; // failed spill degrades to bounded-without-file
      }
      const marker = renderTruncationMarker({
        headChars: snap.head.length,
        tailChars: snap.tail.length,
        totalChars: snap.totalChars,
        label: relativizeWithin(root, path),
      });
      return `${snap.head}${marker}${snap.tail}`;
    };

    let timedOut = false;
    let settled = false;
    let killRequested = false;
    let procRef: SandboxProcessLike | null = null;
    const killProc = (): void => {
      const proc = procRef;
      if (proc === null) return;
      void Promise.resolve(proc.kill()).then(
        () => undefined,
        () => undefined,
      );
    };
    // The connect phase (session resolution + spawn) is raced against this
    // signal: a stuck transport must not outlive timeoutMs, and kill() must
    // settle a command whose spawn never returns (there's no process to kill
    // yet, so aborting the wait is the only lever). Resolution — not
    // rejection — so a signal fired after the race is decided is inert.
    let abortConnect: () => void = () => undefined;
    const connectAborted = new Promise<null>((resolve) => {
      abortConnect = () => resolve(null);
    });

    const result = (async (): Promise<RunResult> => {
      let sb: SandboxExecSessionLike | null = null;
      // The timeout covers the whole run, connect phase included.
      const timer = setTimeout(() => {
        timedOut = true;
        killProc();
        abortConnect();
      }, timeoutMs);
      try {
        const connect = (async () => {
          const s = await session();
          const proc = await s.spawn({ command, workingDirectory: cwd });
          return { s, proc };
        })();
        // A spawn that resolves only after the abort still gets its process
        // killed — otherwise a timed-out connect leaks a live command.
        void connect.then(
          ({ proc }) => {
            procRef = proc;
            if (killRequested || timedOut) killProc();
          },
          () => undefined,
        );
        const connected = await Promise.race([connect, connectAborted]);
        if (connected === null) {
          // Timed out or killed before the sandbox process existed.
          return {
            stdout: "",
            stderr: timedOut ? "" : "killed before the sandbox process started",
            exitCode: null,
            timedOut,
          };
        }
        sb = connected.s;
        const proc = connected.proc;
        const pumps = [pump(proc.stdout, stdoutState), pump(proc.stderr, stderrState)];
        // A pump rejection (stream error) mustn't surface as an unhandled
        // rejection — the settle below tolerates it via allSettled.
        for (const p of pumps) p.catch(() => undefined);
        const exit = await Promise.resolve(proc.wait());
        // Bound the post-exit drain: streams normally close right after
        // exit, but a killed process's transport may never close them —
        // cancel the readers after the grace window so settle can't hang.
        const drained = Promise.allSettled(pumps);
        const graceTimer = setTimeout(() => {
          for (const r of readers) {
            void Promise.resolve(r.cancel()).then(
              () => undefined,
              () => undefined,
            );
          }
        }, STREAM_DRAIN_GRACE_MS);
        try {
          await drained;
        } finally {
          clearTimeout(graceTimer);
        }
        return {
          stdout: await settleText(stdoutState, "stdout", sb),
          stderr: await settleText(stderrState, "stderr", sb),
          exitCode: exit.exitCode,
          timedOut,
        };
      } catch (err) {
        // Spawn/transport failure (or a backend whose wait() rejects on
        // kill): host-runner parity — exitCode null, the message appended to
        // stderr. A timeout kill carries no message (the flag says it all).
        killProc();
        const message = timedOut ? "" : err instanceof Error ? err.message : String(err);
        return {
          stdout: await settleText(stdoutState, "stdout", sb),
          stderr: `${await settleText(stderrState, "stderr", sb)}${message}`,
          exitCode: null,
          timedOut,
        };
      } finally {
        clearTimeout(timer);
        settled = true;
      }
    })();

    return {
      result,
      progress() {
        return {
          stdout: capturePreview(stdoutState.capture),
          stderr: capturePreview(stderrState.capture),
          stdoutBytes: stdoutState.bytes,
          stderrBytes: stderrState.bytes,
          stdoutTruncated: stdoutState.capture.totalChars() > MAX_PREVIEW,
          stderrTruncated: stderrState.capture.totalChars() > MAX_PREVIEW,
        };
      },
      kill() {
        if (settled) return;
        killRequested = true;
        killProc();
        abortConnect();
      },
    };
  }

  return {
    startCommand,
    runCommand: (command, runOpts) => startCommand(command, runOpts).result,
  };
}
