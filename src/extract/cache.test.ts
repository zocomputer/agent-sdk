import { describe, expect, test } from "bun:test";
import { createStatCache } from "./cache";

const id = (mtimeMs: number, size = 10) => ({ mtimeMs, size });

describe("createStatCache", () => {
  test("hit skips recompute; changed mtime or size recomputes", async () => {
    const cache = createStatCache<string>(5);
    let computes = 0;
    const compute = async () => `v${++computes}`;

    expect(await cache.get("a", id(1), compute)).toBe("v1");
    expect(await cache.get("a", id(1), compute)).toBe("v1");
    expect(computes).toBe(1);

    expect(await cache.get("a", id(2), compute)).toBe("v2");
    expect(await cache.get("a", id(2, 99), compute)).toBe("v3");
  });

  test("evicts the least recently used entry past the limit", async () => {
    const cache = createStatCache<string>(2);
    let computes = 0;
    const compute = async () => `v${++computes}`;

    await cache.get("a", id(1), compute); // v1
    await cache.get("b", id(1), compute); // v2
    await cache.get("a", id(1), compute); // refresh "a" — "b" is now oldest
    await cache.get("c", id(1), compute); // v3, evicts "b"
    expect(cache.size()).toBe(2);

    // "a" survived (hit — compute not called); "b" was evicted (recomputes).
    expect(await cache.get("a", id(1), async () => "recomputed")).toBe("v1");
    expect(await cache.get("b", id(1), async () => "recomputed")).toBe("recomputed");
  });

  test("a throwing compute stores nothing", async () => {
    const cache = createStatCache<string>(5);
    await expect(
      cache.get("a", id(1), async () => {
        throw new Error("corrupt");
      }),
    ).rejects.toThrow("corrupt");
    expect(cache.size()).toBe(0);
    expect(await cache.get("a", id(1), async () => "ok")).toBe("ok");
  });
});
