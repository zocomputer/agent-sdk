import { EventEmitter } from "node:events";
import { afterEach, describe, expect, test } from "bun:test";
import type { ClientChannel } from "ssh2";
import { buildSpawnedProcess } from "./ssh-session";

// buildSpawnedProcess is a thin wrapper over awaitCommand (exit reconciliation +
// abort precedence are tested there, in ssh-exec.test.ts). These cover ONLY what
// this wrapper adds on top: kill() semantics, and that the exit promise is
// handled even when no one calls wait() (so a channel error can't become an
// unhandled rejection). Exit-code/signal/abort behavior is deliberately NOT
// re-tested here — that would just exercise awaitCommand through a pass-through.

class FakeChannel extends EventEmitter {
  readonly stderr = new EventEmitter();
  signals: string[] = [];
  closed = false;
  signal(name: string): void {
    this.signals.push(name);
  }
  close(): void {
    this.closed = true;
  }
  // nodeToWebStream calls these (Readable surface); harmless no-ops here.
  pause(): void {}
  resume(): void {}
  destroy(): void {}
}
const fakeChannel = (): FakeChannel => new FakeChannel();
const asChannel = (c: FakeChannel): ClientChannel => c as unknown as ClientChannel;

let unhandled: unknown[] = [];
process.on("unhandledRejection", (e) => void unhandled.push(e));
afterEach(() => {
  unhandled = [];
});
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 10));

describe("buildSpawnedProcess", () => {
  test("kill() signals + closes the channel, idempotently", async () => {
    const ch = fakeChannel();
    const proc = buildSpawnedProcess(asChannel(ch));
    await proc.kill();
    await proc.kill();
    expect(ch.signals).toEqual(["KILL"]); // once, not twice
    expect(ch.closed).toBe(true);
  });

  test("a channel error with NO wait() caller does not become an unhandled rejection", async () => {
    const ch = fakeChannel();
    buildSpawnedProcess(asChannel(ch)); // never call wait()
    ch.emit("error", new Error("orphan boom"));
    await flush();
    expect(unhandled).toHaveLength(0);
  });

  test("wait() surfaces the reconciled exit code", async () => {
    // Not re-testing reconciliation (that's awaitCommand's) — just that the
    // wrapper passes the exitCode through in the eve-contract shape.
    const ch = fakeChannel();
    const proc = buildSpawnedProcess(asChannel(ch));
    ch.emit("exit", 0);
    ch.emit("close");
    expect(await proc.wait()).toEqual({ exitCode: 0 });
  });
});
