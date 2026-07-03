import type { ClientChannel } from "ssh2";

// The one place ssh2 exec-channel completion is reconciled, so run/spawn/sftp
// can't drift on it. Two concerns live here, both correct-by-construction:
//   1. exit reconciliation — prefer the `exit` event's (code, signal) over what
//      `close` carried; a signal → SIGNAL_EXIT_CODE, never a clean 0.
//   2. abort precedence — if the abort signal is (or becomes) aborted, the
//      command rejects with the abort reason, EVEN IF the channel also exited in
//      the same tick. Abort structurally wins because the single settle() point
//      checks `aborted` before it ever resolves success.

/** Exit code we report when a command is killed by a signal (no numeric code). */
export const SIGNAL_EXIT_CODE = 137; // 128 + SIGKILL(9), the conventional shell value

/** The reconciled outcome of an exec channel that exited (not aborted/errored). */
export interface ExecExit {
  /** Reconciled exit code; a signal termination maps to SIGNAL_EXIT_CODE. */
  readonly exitCode: number;
  /** The terminating signal name, if the channel reported one (else null). */
  readonly signal: string | null;
}

/** The abort reason as an Error (falls back to a generic one). */
function abortError(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new Error(typeof signal.reason === "string" ? signal.reason : "aborted");
}

/**
 * Await an exec channel's completion, with abort taking precedence over a
 * same-tick exit.
 *
 * - Resolves `ExecExit` when the channel exits/closes (and not aborted).
 * - Rejects with the abort reason if `abortSignal` is or becomes aborted — and
 *   closes the channel so the remote process is torn down. Wins a same-tick race
 *   with exit because `settle()` re-checks `aborted` before resolving success.
 * - Rejects with the channel error on a stream `error`.
 *
 * Resolves only on exit/close/error/abort; attach `data`/`stderr` separately.
 */
export function awaitCommand(
  stream: ClientChannel,
  abortSignal?: AbortSignal,
): Promise<ExecExit> {
  return new Promise<ExecExit>((resolve, reject) => {
    let code: number | null = null;
    let signal: string | null = null;
    let sawExit = false;
    let settled = false;

    const onAbort = (): void => {
      // close() tears down the remote process; settle() turns this into a reject.
      try {
        stream.close();
      } catch {
        // already closed
      }
      settle();
    };

    // The single settle point. Abort always wins: if the signal is aborted we
    // reject with its reason regardless of whether the channel also exited.
    const settle = (channelError?: Error): void => {
      if (settled) return;
      settled = true;
      abortSignal?.removeEventListener("abort", onAbort);
      if (abortSignal?.aborted) return reject(abortError(abortSignal));
      if (channelError !== undefined) return reject(channelError);
      const sig = signal;
      const reconciled = sig != null ? SIGNAL_EXIT_CODE : (code ?? 0);
      resolve({ exitCode: reconciled, signal: sig });
    };

    // Already aborted before we wired up — close + reject without hanging.
    if (abortSignal?.aborted) {
      onAbort();
      return;
    }
    abortSignal?.addEventListener("abort", onAbort, { once: true });

    stream
      .on("exit", (c: number | null, s?: string | null) => {
        sawExit = true;
        code = c;
        signal = s ?? null;
      })
      .on("close", (closeCode?: number | null, closeSignal?: string | null) => {
        // Prefer the authoritative `exit` values; fall back to what close carried.
        if (!sawExit) {
          code = closeCode ?? null;
          signal = closeSignal ?? null;
        }
        settle();
      })
      .on("error", (e: Error) => settle(e));
  });
}
