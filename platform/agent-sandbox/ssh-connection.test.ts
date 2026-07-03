import { describe, expect, test } from "bun:test";
import {
  type ManagedConn,
  type SshSandboxAccess,
  SshConnectionManager,
} from "./ssh-connection";

// Unit tests for the SSH connection state machine, driven entirely through
// injectable `acquireAccess` / `connect` / `now` — no real SSH. Each test pins
// one transition; together they cover the interleavings that previously leaked
// (reuse, re-mint-on-expiry, reconnect-keeps-token, retry-on-revoked, dispose).

const SKEW = 30_000;
let clock = 1_000_000;
const now = () => clock;

/** Access expiring `ms` from the current clock. */
function access(id: string, expiresInMs: number): SshSandboxAccess {
  return {
    sandboxId: id,
    sshHost: "h",
    sshUser: `tok-${id}`,
    expiresAt: new Date(clock + expiresInMs).toISOString(),
  };
}

/** A fake connection that records close callbacks so a test can drop it. */
function fakeConn(): ManagedConn<{ marker: true }> & { drop(): void; ended: boolean } {
  let onCloseCb: (() => void) | null = null;
  const c = {
    client: { marker: true as const },
    ended: false,
    end() {
      c.ended = true;
    },
    onClose(cb: () => void) {
      onCloseCb = cb;
    },
    drop() {
      onCloseCb?.();
    },
  };
  return c;
}

/** Build a manager with counting `acquireAccess`/`connect` and controllable behavior. */
function makeManager(opts?: {
  connectFails?: (attempt: number) => boolean;
}) {
  const acquired: string[] = [];
  const connected: string[] = [];
  const conns: ReturnType<typeof fakeConn>[] = [];
  let mintCount = 0;
  let connectAttempt = 0;

  const manager = new SshConnectionManager<{ marker: true }>({
    expirySkewMs: SKEW,
    now,
    acquireAccess: () => {
      mintCount += 1;
      const a = access(`sbx-${mintCount}`, 10 * 60_000); // 10 min
      acquired.push(a.sshUser);
      return Promise.resolve(a);
    },
    connect: (a) => {
      connectAttempt += 1;
      if (opts?.connectFails?.(connectAttempt)) {
        return Promise.reject(new Error("connect failed"));
      }
      connected.push(a.sshUser);
      const c = fakeConn();
      conns.push(c);
      return Promise.resolve(c);
    },
  });

  return { manager, acquired, connected, conns, get mintCount() { return mintCount; } };
}

describe("SshConnectionManager", () => {
  test("first ensure mints + connects; reuses on a second call", async () => {
    const m = makeManager();
    const a = await m.manager.ensure();
    const b = await m.manager.ensure();
    expect(a).toBe(b); // same connection reused
    expect(m.mintCount).toBe(1);
    expect(m.connected.length).toBe(1);
  });

  test("coalesces concurrent first connects", async () => {
    const m = makeManager();
    const [a, b] = await Promise.all([m.manager.ensure(), m.manager.ensure()]);
    expect(a).toBe(b);
    expect(m.mintCount).toBe(1);
    expect(m.connected.length).toBe(1);
  });

  test("re-mints when the token has expired", async () => {
    const m = makeManager();
    await m.manager.ensure();
    clock += 11 * 60_000; // advance past the 10-min token
    await m.manager.ensure();
    expect(m.mintCount).toBe(2); // fresh token minted
  });

  test("reconnects with the HELD token after a socket drop (no re-mint)", async () => {
    const m = makeManager();
    await m.manager.ensure();
    m.conns[0]?.drop(); // socket dropped, token still valid
    await m.manager.ensure();
    expect(m.mintCount).toBe(1); // reused the held token — no new mint
    expect(m.connected.length).toBe(2); // but did reconnect
    expect(m.connected[0]).toBe(m.connected[1]); // same token
  });

  test("re-mints + retries once when reconnecting with a held token fails", async () => {
    // First connect ok; the reconnect (attempt 2, reusing held token) fails;
    // then a fresh mint + connect (attempt 3) succeeds.
    const m = makeManager({ connectFails: (n) => n === 2 });
    await m.manager.ensure();
    m.conns[0]?.drop();
    await m.manager.ensure();
    expect(m.mintCount).toBe(2); // re-minted after the revoked-token failure
  });

  test("a fresh-token connect failure propagates (no infinite retry)", async () => {
    const m = makeManager({ connectFails: (n) => n === 1 }); // first connect (fresh) fails
    await expect(m.manager.ensure()).rejects.toThrow(/connect failed/);
  });

  test("ensure after dispose rejects without minting", async () => {
    const m = makeManager();
    m.manager.dispose();
    await expect(m.manager.ensure()).rejects.toThrow(/disposed/);
    expect(m.mintCount).toBe(0);
  });

  test("dispose mid-connect: closes the connection, doesn't install it", async () => {
    // Gate the connect so we can dispose() while it's in flight.
    let releaseConnect: (() => void) | null = null;
    const gate = new Promise<void>((r) => (releaseConnect = r));
    const conns: ReturnType<typeof fakeConn>[] = [];
    let mintCount = 0;

    const manager = new SshConnectionManager<{ marker: true }>({
      expirySkewMs: SKEW,
      now,
      acquireAccess: () => {
        mintCount += 1;
        return Promise.resolve(access(`sbx-${mintCount}`, 600_000));
      },
      connect: async () => {
        await gate; // block until the test releases
        const c = fakeConn();
        conns.push(c);
        return c;
      },
    });

    const pending = manager.ensure();
    manager.dispose(); // dispose while connect is blocked
    releaseConnect!(); // now let connect resolve

    await expect(pending).rejects.toThrow(/disposed/);
    // No connection is left installed or leaked: either we bailed before connect
    // (the disposed check between acquire and connect), or the late-resolving
    // connection was closed. Never a live, un-disposed connection.
    expect(conns.every((c) => c.ended)).toBe(true);
    expect(manager.currentSandboxId()).toBeNull();
  });

  test("dispose closes the live connection", async () => {
    const m = makeManager();
    await m.manager.ensure();
    m.manager.dispose();
    expect(m.conns[0]?.ended).toBe(true);
  });

  test("currentSandboxId is null before connect, set after", async () => {
    const m = makeManager();
    expect(m.manager.currentSandboxId()).toBeNull();
    await m.manager.ensure();
    expect(m.manager.currentSandboxId()).toBe("sbx-1");
  });
});
