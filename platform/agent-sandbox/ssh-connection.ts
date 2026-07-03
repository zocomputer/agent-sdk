/** Scoped SSH credentials the control plane mints for one sandbox. */
export interface SshSandboxAccess {
  readonly sandboxId: string;
  readonly sshHost: string;
  /** Username = the scoped access token (Daytona's SSH gateway model). */
  readonly sshUser: string;
  /** ISO timestamp when the token expires; we re-mint before then. */
  readonly expiresAt: string;
}

// The SSH connection lifecycle as an explicit, testable state machine, lifted
// out of the session surface so its transitions live in one auditable place
// (the runtime's recurring bugs all came from ad-hoc interleavings here).
//
// States: idle (no connection) → connecting (a connect in flight) → connected
// (live) → back to idle on a socket drop, or disposed (terminal). The scoped
// SSH token (`heldAccess`) is retained across a socket drop so a pure reconnect
// reuses it instead of re-minting; it's dropped only when expired or on dispose.
//
// `connect` is injected so the manager is unit-tested without a live SSH socket;
// the runtime passes a real ssh2-backed connector.

/**
 * Minimal live-connection handle the manager drives. Generic over the carried
 * client `C` (the runtime carries an ssh2 `Client`, which `run` execs against;
 * tests carry a stub) — the manager only ever uses `end`/`onClose`.
 */
export interface ManagedConn<C = unknown> {
  /** The underlying client (ssh2 `Client` in the runtime); used by callers, not the manager. */
  readonly client: C;
  /** Close the connection (idempotent). */
  end(): void;
  /** Register a one-shot callback for when the connection drops. */
  onClose(cb: () => void): void;
}

/** Opens a connection for the given scoped access, or rejects. */
export type Connector<C> = (access: SshSandboxAccess) => Promise<ManagedConn<C>>;

/** Is the access token expired (or unparsable → treat as expired, fail-safe)? */
function isExpired(access: SshSandboxAccess, skewMs: number, now: number): boolean {
  const expiry = Date.parse(access.expiresAt);
  if (Number.isNaN(expiry)) return true;
  return expiry - skewMs <= now;
}

export interface SshConnectionManagerOptions<C> {
  /** Mint fresh scoped access (the runtime's control-plane call). */
  readonly acquireAccess: () => Promise<SshSandboxAccess>;
  /** Open a connection for an access (injectable; real impl wraps ssh2). */
  readonly connect: Connector<C>;
  /** Re-mint this many ms before the token's actual expiry. */
  readonly expirySkewMs: number;
  /** Clock, injectable for tests. Defaults to `Date.now`. */
  readonly now?: () => number;
}

/**
 * Owns one sandbox's SSH connection across its lifetime. `ensure()` returns a
 * live connection, (re)connecting/(re)minting as the rules below require;
 * `dispose()` shuts it down terminally.
 */
export class SshConnectionManager<C> {
  private conn: ManagedConn<C> | null = null;
  private access: SshSandboxAccess | null = null;
  private connecting: Promise<ManagedConn<C>> | null = null;
  private disposed = false;
  private sandboxId: string | null = null;
  private readonly opts: SshConnectionManagerOptions<C>;
  private readonly now: () => number;

  constructor(opts: SshConnectionManagerOptions<C>) {
    this.opts = opts;
    this.now = opts.now ?? Date.now;
  }

  /** The provider sandbox id once a connection has been established, else null. */
  currentSandboxId(): string | null {
    return this.sandboxId;
  }

  private expired(access: SshSandboxAccess): boolean {
    return isExpired(access, this.opts.expirySkewMs, this.now());
  }

  /**
   * Get a live connection. Reuses a live, non-expired one; coalesces concurrent
   * callers onto one in-flight connect; reconnects with the held (still-valid)
   * token on a pure socket drop, and only re-mints when the token is expired/
   * absent. A connect that fails on a reused token (gateway may have revoked it
   * on a sandbox restart) re-mints once and retries.
   */
  async ensure(): Promise<ManagedConn<C>> {
    if (this.disposed) throw new Error("zo sandbox: session is disposed");
    if (this.conn !== null && this.access !== null && !this.expired(this.access)) {
      return this.conn;
    }
    if (this.connecting !== null) return await this.connecting;

    const held = this.access;
    this.conn?.end();
    this.conn = null;
    this.connecting = this.openConnection(held);
    try {
      return await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  private async openConnection(held: SshSandboxAccess | null): Promise<ManagedConn<C>> {
    // dispose() can land at any await below; bail at each step so a disposed
    // session never spends a control-plane mint or opens a doomed connection.
    const abortIfDisposed = (): void => {
      if (this.disposed) throw new Error("zo sandbox: session disposed during connect");
    };

    // Reuse the held token if still valid (socket just dropped); else mint fresh.
    let used: SshSandboxAccess;
    if (held !== null && !this.expired(held)) {
      used = held;
    } else {
      abortIfDisposed(); // don't mint for a disposed session
      used = await this.opts.acquireAccess();
    }
    abortIfDisposed(); // don't open a connection for a disposed session
    let c: ManagedConn<C>;
    try {
      c = await this.opts.connect(used);
    } catch (error) {
      // A reused token may have been revoked server-side (sandbox restart) —
      // re-mint once and retry. A fresh-token failure is a real error.
      if (used === held) {
        abortIfDisposed();
        used = await this.opts.acquireAccess();
        abortIfDisposed();
        c = await this.opts.connect(used);
      } else {
        throw error;
      }
    }
    // dispose() during the connect → this connection is orphaned; close it.
    if (this.disposed) {
      c.end();
      throw new Error("zo sandbox: session disposed during connect");
    }
    // On a socket drop, fall back to idle — but KEEP the token so the next
    // ensure() reconnects with it rather than re-minting needlessly.
    c.onClose(() => {
      if (this.conn === c) this.conn = null;
    });
    this.conn = c;
    this.access = used;
    this.sandboxId = used.sandboxId;
    return c;
  }

  /** Terminal shutdown: close the connection and refuse further ensure() calls. */
  dispose(): void {
    this.disposed = true;
    this.conn?.end();
    this.conn = null;
    this.access = null;
  }
}
