import { EventEmitter } from "node:events";
import { describe, expect, test } from "bun:test";
import type { ClientChannel } from "ssh2";
import { SIGNAL_EXIT_CODE, awaitCommand } from "./ssh-exec";

// awaitCommand is the single exec-completion primitive (run / spawn / sftp all
// use it), so its invariants are tested once here: exit reconciliation, the
// signal mapping, and ABORT PRECEDENCE — abort wins a same-tick race with exit.

class FakeChannel extends EventEmitter {
  readonly stderr = new EventEmitter();
  closed = false;
  signal(): void {}
  close(): void {
    this.closed = true;
  }
}
const chan = (): FakeChannel => new FakeChannel();
const asChannel = (c: FakeChannel): ClientChannel => c as unknown as ClientChannel;

describe("awaitCommand", () => {
  test("resolves the exit code on a clean exit", async () => {
    const c = chan();
    const p = awaitCommand(asChannel(c));
    c.emit("exit", 0);
    c.emit("close");
    expect(await p).toEqual({ exitCode: 0, signal: null });
  });

  test("falls back to the close code when there's no exit event", async () => {
    const c = chan();
    const p = awaitCommand(asChannel(c));
    c.emit("close", 3, null);
    expect(await p).toEqual({ exitCode: 3, signal: null });
  });

  test("a signal maps to SIGNAL_EXIT_CODE and reports the signal name", async () => {
    const c = chan();
    const p = awaitCommand(asChannel(c));
    c.emit("exit", null, "SIGKILL");
    c.emit("close");
    expect(await p).toEqual({ exitCode: SIGNAL_EXIT_CODE, signal: "SIGKILL" });
  });

  test("prefers the exit event's status over the close args", async () => {
    const c = chan();
    const p = awaitCommand(asChannel(c));
    c.emit("exit", 7, null);
    c.emit("close", 0, null); // close says 0, but exit said 7 → 7 wins
    expect((await p).exitCode).toBe(7);
  });

  test("a channel error rejects", async () => {
    const c = chan();
    const p = awaitCommand(asChannel(c));
    c.emit("error", new Error("boom"));
    await expect(p).rejects.toThrow(/boom/);
  });

  test("already-aborted: rejects with the reason and closes the channel", async () => {
    const c = chan();
    const ac = new AbortController();
    ac.abort(new Error("pre"));
    const p = awaitCommand(asChannel(c), ac.signal);
    await expect(p).rejects.toThrow(/pre/);
    expect(c.closed).toBe(true);
  });

  test("abort mid-flight rejects + closes", async () => {
    const c = chan();
    const ac = new AbortController();
    const p = awaitCommand(asChannel(c), ac.signal);
    ac.abort(new Error("cancelled"));
    await expect(p).rejects.toThrow(/cancelled/);
    expect(c.closed).toBe(true);
  });

  test("ABORT PRECEDENCE: abort wins a same-tick race with a clean exit", async () => {
    const c = chan();
    const ac = new AbortController();
    const p = awaitCommand(asChannel(c), ac.signal);
    // Both happen in the same synchronous turn: abort first, then the channel
    // reports a clean exit. settle() must reject (abort), never resolve success.
    ac.abort(new Error("raced"));
    c.emit("exit", 0);
    c.emit("close");
    await expect(p).rejects.toThrow(/raced/);
  });

  test("genuine completion before any abort resolves (no over-reject)", async () => {
    const c = chan();
    const ac = new AbortController();
    const p = awaitCommand(asChannel(c), ac.signal);
    c.emit("exit", 0);
    c.emit("close"); // settles success here...
    ac.abort(new Error("too-late")); // ...abort arrives after; must not flip it
    expect(await p).toEqual({ exitCode: 0, signal: null });
  });
});
