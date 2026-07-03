import { EventEmitter } from "node:events";
import type { Readable } from "node:stream";
import { afterEach, describe, expect, test } from "bun:test";
import { nodeToWebStream, streamToBytes } from "./ssh-session";

// nodeToWebStream must be terminal-safe by construction: once end/error/cancel
// happens, a late ssh2 `data` event must NOT enqueue on the settled controller
// (which throws) or escape into ssh2's emitter as an uncaught error.

/** A fake ssh2 Readable: an EventEmitter with the Readable methods we drive. */
class FakeReadable extends EventEmitter {
  destroyed = false;
  paused = false;
  pause(): void {
    this.paused = true;
  }
  resume(): void {
    this.paused = false;
  }
  destroy(): void {
    this.destroyed = true;
  }
}

// Surface any stray throw from inside the data handler (the bug we guard against).
let caught: unknown[] = [];
const onUncaught = (e: unknown): void => void caught.push(e);
process.on("uncaughtException", onUncaught);
afterEach(() => {
  caught = [];
});

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 10));

// FakeReadable isn't a real node Readable; the cast matches how ssh2 channels
// are passed (they satisfy the on/pause/resume/destroy surface we use).
const asReadable = (r: FakeReadable): Readable => r as unknown as Readable;

describe("nodeToWebStream", () => {
  test("streams data through then closes on end", async () => {
    const src = new FakeReadable();
    const web = nodeToWebStream(asReadable(src));
    const reader = web.getReader();
    src.emit("data", Buffer.from("hello"));
    const first = await reader.read();
    expect(first.value && new TextDecoder().decode(first.value)).toBe("hello");
    src.emit("end");
    expect((await reader.read()).done).toBe(true);
  });

  test("a late data after end does not throw or enqueue", async () => {
    const src = new FakeReadable();
    const web = nodeToWebStream(asReadable(src));
    const reader = web.getReader();
    src.emit("end");
    expect((await reader.read()).done).toBe(true);
    src.emit("data", Buffer.from("late")); // must be ignored, not throw
    await flush();
    expect(caught).toHaveLength(0);
  });

  test("a late data after error does not throw", async () => {
    const src = new FakeReadable();
    const web = nodeToWebStream(asReadable(src));
    const reader = web.getReader();
    src.emit("error", new Error("boom"));
    await expect(reader.read()).rejects.toThrow(/boom/);
    src.emit("data", Buffer.from("late")); // ignored, no throw
    await flush();
    expect(caught).toHaveLength(0);
  });

  test("cancel destroys the source", async () => {
    const src = new FakeReadable();
    const web = nodeToWebStream(asReadable(src));
    await web.cancel();
    expect(src.destroyed).toBe(true);
    src.emit("data", Buffer.from("after-cancel")); // ignored, no throw
    await flush();
    expect(caught).toHaveLength(0);
  });
});

describe("streamToBytes", () => {
  const bytes = (s: string): Uint8Array => new TextEncoder().encode(s);

  test("collects all chunks into one Uint8Array", async () => {
    const web = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(bytes("ab"));
        c.enqueue(bytes("cd"));
        c.close();
      },
    });
    expect(new TextDecoder().decode(await streamToBytes(web))).toBe("abcd");
  });

  test("an already-aborted signal rejects and cancels the stream", async () => {
    let cancelled = false;
    const web = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
    });
    const ac = new AbortController();
    ac.abort(new Error("pre"));
    await expect(streamToBytes(web, ac.signal)).rejects.toThrow(/pre/);
    expect(cancelled).toBe(true);
  });

  test("an abort DURING a pending read rejects promptly (doesn't wait for the read)", async () => {
    // A producer that never enqueues: reader.read() stays pending forever. The
    // bug was checking aborted only between reads — so this would hang. The race
    // must reject as soon as the signal fires.
    let cancelled = false;
    const web = new ReadableStream<Uint8Array>({
      pull() {
        return new Promise<void>(() => {}); // never resolves
      },
      cancel() {
        cancelled = true;
      },
    });
    const ac = new AbortController();
    const p = streamToBytes(web, ac.signal);
    setTimeout(() => ac.abort(new Error("mid-read-cancel")), 10);
    await expect(p).rejects.toThrow(/mid-read-cancel/);
    expect(cancelled).toBe(true);
  });
});
