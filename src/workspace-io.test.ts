import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLocalIo, localIoProvider, searchLocal } from "./workspace-io";

// realpath because macOS's tmpdir is a /private symlink and workspace paths
// must be canonical. Not a git repo, so listFiles exercises the walk fallback.
const root = realpathSync(mkdtempSync(join(tmpdir(), "agent-sdk-io-")));
afterAll(() => rmSync(root, { recursive: true, force: true }));

mkdirSync(join(root, "src"), { recursive: true });
writeFileSync(join(root, "hello.txt"), "alpha\nbeta\ngamma\n");
writeFileSync(join(root, "src/app.ts"), "export const answer = 42;\n");

const io = createLocalIo(root);

describe("createLocalIo", () => {
  test("stat reports size, mtime, and file-ness; null for a missing path", async () => {
    const stat = await io.stat(join(root, "hello.txt"));
    if (stat === null) throw new Error("expected a stat");
    expect(stat.isFile).toBe(true);
    expect(stat.size).toBe(17);
    expect(stat.mtimeMs).toBeGreaterThan(0);

    const dir = await io.stat(join(root, "src"));
    expect(dir?.isFile).toBe(false);
    expect(await io.stat(join(root, "missing.txt"))).toBeNull();
  });

  test("readFile returns bytes; null for a missing file", async () => {
    const bytes = await io.readFile(join(root, "hello.txt"));
    expect(bytes?.toString("utf8")).toBe("alpha\nbeta\ngamma\n");
    expect(await io.readFile(join(root, "missing.txt"))).toBeNull();
  });

  test("writeFile creates parent directories and overwrites", async () => {
    const target = join(root, "deep/nested/out.txt");
    await io.writeFile(target, "one");
    await io.writeFile(target, "two");
    expect(readFileSync(target, "utf8")).toBe("two");
  });

  test("writeFile rejects when cancellation arrives after the local mutation", async () => {
    const controller = new AbortController();
    const target = join(root, "cancelled-write.txt");
    const writing = createLocalIo(root, controller.signal).writeFile(target, "committed");
    controller.abort(new Error("turn cancelled"));
    await expect(writing).rejects.toThrow("turn cancelled");
    expect(readFileSync(target, "utf8")).toBe("committed");
  });

  test("listFiles yields root-relative paths, scoped when asked", async () => {
    const all = [...(await io.listFiles())];
    expect(all).toContain("hello.txt");
    expect(all).toContain("src/app.ts");
    const scoped = [...(await io.listFiles(join(root, "src")))];
    expect(scoped).toContain("src/app.ts");
    expect(scoped).not.toContain("hello.txt");
  });

  test("search matches lines, honors glob and scope, and stops at the cap", async () => {
    const hit = await io.search({
      pattern: "answer = [0-9]+",
      ignoreCase: false,
      maxMatches: 10,
    });
    expect(hit.matches).toEqual([
      { file: "src/app.ts", line: 1, text: "export const answer = 42;" },
    ]);
    expect(hit.stopped).toBe(false);

    const globbed = await io.search({
      pattern: "alpha",
      ignoreCase: false,
      glob: "**/*.ts",
      maxMatches: 10,
    });
    expect(globbed.matches).toHaveLength(0);

    const capped = await io.search({
      pattern: "^(alpha|beta|gamma)$",
      ignoreCase: false,
      maxMatches: 2,
    });
    expect(capped.matches).toHaveLength(2);
    expect(capped.stopped).toBe("max-matches");
  });

  test("search scopes to a single file", async () => {
    const result = await io.search({
      pattern: "beta",
      ignoreCase: false,
      scope: join(root, "hello.txt"),
      maxMatches: 10,
    });
    expect(result.matches).toEqual([{ file: "hello.txt", line: 2, text: "beta" }]);
  });

  test("search counts skipped oversized files", async () => {
    const bigRoot = realpathSync(mkdtempSync(join(tmpdir(), "agent-sdk-io-big-")));
    try {
      writeFileSync(join(bigRoot, "big.txt"), "x".repeat(2_000_000));
      writeFileSync(join(bigRoot, "small.txt"), "x marks the spot\n");
      const result = await searchLocal(bigRoot, {
        pattern: "x",
        ignoreCase: false,
        maxMatches: 10,
      });
      expect(result.skippedLargeFiles).toBe(1);
      expect(result.matches.map((m) => m.file)).toEqual(["small.txt"]);
    } finally {
      rmSync(bigRoot, { recursive: true, force: true });
    }
  });

  test("the provider ignores ctx and reuses one IO", () => {
    const provider = localIoProvider(root);
    expect(provider(undefined)).toBe(provider(undefined));
  });

  test("a signal-bound provider rejects file work after turn cancellation", async () => {
    const controller = new AbortController();
    const provider = localIoProvider(root);
    const bound = provider({
      abortSignal: controller.signal,
      callId: "call-cancelled",
      getSandbox: () => Promise.reject(new Error("local IO does not use a sandbox")),
    });
    controller.abort();
    await expect(bound.stat(join(root, "hello.txt"))).rejects.toMatchObject({
      name: "AbortError",
    });
    await expect(bound.listFiles()).rejects.toMatchObject({ name: "AbortError" });
    await expect(
      bound.search({ pattern: "alpha", ignoreCase: false, maxMatches: 10 }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  test("a large local search yields so cancellation can arrive mid-scan", async () => {
    writeFileSync(
      join(root, "cancel-search.txt"),
      Array.from({ length: 10_000 }, (_, index) => `line ${index}`).join("\n"),
    );
    const controller = new AbortController();
    const searching = searchLocal(
      root,
      { pattern: "never-matches", ignoreCase: false, maxMatches: 10 },
      controller.signal,
    );
    setImmediate(() => controller.abort());
    await expect(searching).rejects.toMatchObject({ name: "AbortError" });
  });
});
