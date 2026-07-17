// The control-plane access-lease renewer for the scratch sandbox path (U4).
//
// The lifecycle sweep suspends a sandbox when BOTH clocks are stale: the
// activity clock (`lastAccessedAt`) and the access lease (`accessLeaseUntil`).
// Only a handle mint stamps them — and the SSH path mints only at operation
// START (`SshConnectionManager.ensure`), so without this loop a blocking exec
// or a live spawned process longer than the lease window leaves the VM
// sweep-eligible and the sweep stops it under the running command.
//
// While ANY work is live (an exec/file op in flight or a spawned process
// running) the renewer re-mints on an interval ANCHORED TO THE LAST SUCCESSFUL
// MINT — work that begins late in a token's life renews immediately instead of
// waiting a full interval. Failures back off briefly and retry while work
// stays live; enforcement stays server-side (a revoked caller's mints fail,
// the lease lapses, the sweep suspends), so the renewer never kills local
// work itself. The SDK's declared-state client (`createStateSandboxClient`)
// carries its own copy of this loop with client-side denial handling; this one
// covers the zo-backend scratch path, whose sessions outlive any one handle.

/** Default renewal cadence — inside both the 10-min SSH TTL and the 15-min access lease. */
export const DEFAULT_LEASE_RENEW_INTERVAL_MS = 8 * 60_000;
/** Default backoff after a failed renewal attempt. */
export const DEFAULT_LEASE_RETRY_DELAY_MS = 30_000;

export interface LeaseRenewerOptions {
  /** Re-mint the access lease (the control-plane handle mint). Result is ignored. */
  readonly renew: () => Promise<unknown>;
  /** Renewal cadence while work is live. Defaults to 8 minutes. */
  readonly intervalMs?: number;
  /** Backoff after a failed renewal. Defaults to 30 s (clamped to the interval). */
  readonly retryDelayMs?: number;
  /** Clock, injectable for tests. Defaults to `Date.now`. */
  readonly now?: () => number;
}

export interface LeaseRenewer {
  /** A unit of work began (op in flight / process spawned). Starts the loop at 0→1. */
  workStarted(): void;
  /** A unit of work ended. Stops the loop at 1→0. */
  workEnded(): void;
  /** A successful mint happened elsewhere (the connection manager) — re-anchor. */
  noteMint(): void;
  /** Terminal stop; no further renewals. */
  dispose(): void;
}

export function createLeaseRenewer(options: LeaseRenewerOptions): LeaseRenewer {
  const intervalMs = options.intervalMs ?? DEFAULT_LEASE_RENEW_INTERVAL_MS;
  const retryDelayMs = Math.min(options.retryDelayMs ?? DEFAULT_LEASE_RETRY_DELAY_MS, intervalMs);
  const now = options.now ?? Date.now;

  let liveWork = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  // Anchor starts at creation so the first operation's own mint (the manager's
  // ensure) isn't raced by an immediate renewal; noteMint re-anchors it.
  let lastMintMs = now();
  let notBeforeMs = 0;
  let disposed = false;

  function clearTimer(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function schedule(): void {
    if (disposed || timer !== null || liveWork === 0) return;
    const nowMs = now();
    const delay = Math.max(lastMintMs + intervalMs - nowMs, notBeforeMs - nowMs, 0);
    timer = setTimeout(() => {
      timer = null;
      void renew();
    }, delay);
    (timer as { unref?: () => void }).unref?.();
  }

  async function renew(): Promise<void> {
    if (disposed || liveWork === 0) return;
    try {
      await options.renew();
      lastMintMs = now();
    } catch {
      // Transient or terminal — either way the enforcement is server-side
      // (a lapsed lease makes the sweep suspend); back off and retry while
      // work stays live.
      notBeforeMs = now() + retryDelayMs;
    }
    schedule();
  }

  return {
    workStarted() {
      liveWork += 1;
      if (liveWork === 1) schedule();
    },
    workEnded() {
      liveWork -= 1;
      if (liveWork <= 0) {
        liveWork = 0;
        clearTimer();
      }
    },
    noteMint() {
      lastMintMs = now();
    },
    dispose() {
      disposed = true;
      liveWork = 0;
      clearTimer();
    },
  };
}
