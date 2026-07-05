import { describe, expect, test } from "bun:test";
import { withPathLock } from "./path-locks";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("withPathLock", () => {
  test("serializes concurrent sections on the same path, FIFO", async () => {
    const log: string[] = [];
    await Promise.all([
      withPathLock("/a", async () => {
        log.push("first:start");
        await delay(20);
        log.push("first:end");
      }),
      withPathLock("/a", async () => {
        log.push("second:start");
        await delay(5);
        log.push("second:end");
      }),
    ]);
    expect(log).toEqual(["first:start", "first:end", "second:start", "second:end"]);
  });

  test("different paths run concurrently", async () => {
    const log: string[] = [];
    await Promise.all([
      withPathLock("/a", async () => {
        log.push("a:start");
        await delay(20);
        log.push("a:end");
      }),
      withPathLock("/b", async () => {
        log.push("b:start");
        await delay(5);
        log.push("b:end");
      }),
    ]);
    // /b finishes inside /a's window — no serialization across paths.
    expect(log).toEqual(["a:start", "b:start", "b:end", "a:end"]);
  });

  test("a thrown error releases the lock and propagates", async () => {
    const failing = withPathLock("/a", async () => {
      throw new Error("boom");
    });
    const after = withPathLock("/a", async () => "ran");
    expect(failing).rejects.toThrow("boom");
    expect(await after).toBe("ran");
  });

  test("returns the section's value", async () => {
    expect(await withPathLock("/a", async () => 42)).toBe(42);
  });
});
