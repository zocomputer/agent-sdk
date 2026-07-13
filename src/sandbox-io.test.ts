import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createSandboxIo,
  extractSearchExit,
  parseSearchOutput,
  sandboxIoProvider,
  SEARCH_OUTPUT_CAP_BYTES,
  shellSingleQuote,
} from "./sandbox-io";
import { createFakeSandboxSession, type FakeSessionLog } from "./workspace-io.test-helpers";
import type { SandboxSessionLike } from "./workspace-io";

// The fake session executes against a local temp dir with a real /bin/sh, so
// the remote command paths (stat, git ls-files, find, rg/grep) actually run.
const root = realpathSync(mkdtempSync(join(tmpdir(), "agent-sdk-sbio-")));
afterAll(() => rmSync(root, { recursive: true, force: true }));

mkdirSync(join(root, "src"), { recursive: true });
writeFileSync(join(root, "hello.txt"), "alpha\nbeta\ngamma\n");
writeFileSync(join(root, "src/app.ts"), "export const answer = 42;\n");
writeFileSync(join(root, "with 'quote'.txt"), "tricky\n");

const log: FakeSessionLog = { commands: [] };
const session = createFakeSandboxSession(root, log);
const io = createSandboxIo({ root, session: () => Promise.resolve(session) });

describe("createSandboxIo", () => {
  test("a signal-bound sandbox IO rejects before starting remote work", async () => {
    const controller = new AbortController();
    controller.abort();
    const cancelled = createSandboxIo({
      root,
      session: () => Promise.resolve(session),
      abortSignal: controller.signal,
    });
    const before = log.commands.length;
    await expect(cancelled.listFiles()).rejects.toMatchObject({ name: "AbortError" });
    expect(log.commands).toHaveLength(before);
  });

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

  test("stat handles paths needing shell quoting", async () => {
    const stat = await io.stat(join(root, "with 'quote'.txt"));
    expect(stat?.isFile).toBe(true);
  });

  test("readFile returns bytes; null for a missing file", async () => {
    const bytes = await io.readFile(join(root, "hello.txt"));
    expect(bytes?.toString("utf8")).toBe("alpha\nbeta\ngamma\n");
    expect(await io.readFile(join(root, "missing.txt"))).toBeNull();
  });

  test("writeFile writes bytes through the session, creating parents", async () => {
    const target = join(root, "deep/nested/out.txt");
    await io.writeFile(target, "written remotely");
    expect(readFileSync(target, "utf8")).toBe("written remotely");
  });

  test("writeFile rejects when cancellation arrives during the remote write", async () => {
    const controller = new AbortController();
    let finish: (() => void) | undefined;
    const writing = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const cancelled = createSandboxIo({
      root,
      abortSignal: controller.signal,
      session: () =>
        Promise.resolve({
          ...session,
          writeBinaryFile: () => writing,
        }),
    });
    const pending = cancelled.writeFile(join(root, "cancelled.txt"), "uncertain");
    controller.abort(new Error("turn cancelled"));
    finish?.();
    await expect(pending).rejects.toThrow("turn cancelled");
  });

  test("listFiles falls back to find outside a git checkout", async () => {
    const files = [...(await io.listFiles())];
    expect(files).toContain("hello.txt");
    expect(files).toContain("src/app.ts");
    const scoped = [...(await io.listFiles(join(root, "src")))];
    expect(scoped).toEqual(["src/app.ts"]);
  });

  test("listFiles rejects when cancellation arrives during the fallback ignore read", async () => {
    const controller = new AbortController();
    let markStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    let finish: ((value: Uint8Array | null) => void) | undefined;
    const reading = new Promise<Uint8Array | null>((resolve) => {
      finish = resolve;
    });
    const cancelled = createSandboxIo({
      root,
      abortSignal: controller.signal,
      session: () =>
        Promise.resolve({
          ...session,
          readBinaryFile: () => {
            markStarted?.();
            return reading;
          },
        }),
    });
    const pending = cancelled.listFiles();
    await started;
    controller.abort(new Error("turn cancelled"));
    finish?.(null);
    await expect(pending).rejects.toThrow("turn cancelled");
  });

  test("listFiles uses git when the workspace is a checkout, subtracting deleted files", async () => {
    const gitRoot = realpathSync(mkdtempSync(join(tmpdir(), "agent-sdk-sbio-git-")));
    try {
      const sh = (cmd: string) =>
        spawnSync("/bin/sh", ["-c", cmd], { cwd: gitRoot, encoding: "utf8" });
      writeFileSync(join(gitRoot, "tracked.txt"), "tracked\n");
      writeFileSync(join(gitRoot, "untracked.txt"), "untracked\n");
      writeFileSync(join(gitRoot, "gone.txt"), "gone\n");
      writeFileSync(join(gitRoot, ".gitignore"), "ignored.txt\n");
      writeFileSync(join(gitRoot, "ignored.txt"), "ignored\n");
      sh("git init -q && git add tracked.txt gone.txt .gitignore");
      sh("git -c user.email=t@t -c user.name=t commit -qm init");
      sh("rm gone.txt");

      const gitIo = createSandboxIo({
        root: gitRoot,
        session: () => Promise.resolve(createFakeSandboxSession(gitRoot)),
      });
      const files = [...(await gitIo.listFiles())];
      expect(files).toContain("tracked.txt");
      expect(files).toContain("untracked.txt");
      expect(files).not.toContain("ignored.txt");
      expect(files).not.toContain("gone.txt");
    } finally {
      rmSync(gitRoot, { recursive: true, force: true });
    }
  });

  test("search finds matches with root-relative paths", async () => {
    const result = await io.search({
      pattern: "answer = [0-9]+",
      ignoreCase: false,
      maxMatches: 10,
    });
    expect(result.matches).toEqual([
      { file: "src/app.ts", line: 1, text: "export const answer = 42;" },
    ]);
    expect(result.stopped).toBe(false);
    // Remote searchers can't count size-skipped files: null, never 0.
    expect(result.skippedLargeFiles).toBeNull();
  });

  test("search skips VCS/dependency dirs even without a .gitignore (rg and grep fallback)", async () => {
    // A non-git root whose only match sits under node_modules: covered by
    // walk.ts's ALWAYS_IGNORED locally, so both remote searchers must skip
    // it too — rg via the !**/dir globs, the find-driven grep via -prune.
    const depRoot = realpathSync(mkdtempSync(join(tmpdir(), "agent-sdk-sbio-deps-")));
    try {
      mkdirSync(join(depRoot, "node_modules/pkg"), { recursive: true });
      writeFileSync(join(depRoot, "node_modules/pkg/index.js"), "dependency needle\n");
      writeFileSync(join(depRoot, "app.ts"), "source needle\n");
      const depSession = createFakeSandboxSession(depRoot);
      const depIo = createSandboxIo({ root: depRoot, session: () => Promise.resolve(depSession) });
      const viaRg = await depIo.search({ pattern: "needle", ignoreCase: false, maxMatches: 10 });
      expect(viaRg.matches.map((m) => m.file)).toEqual(["app.ts"]);

      const noRg: SandboxSessionLike = {
        ...depSession,
        run: ({ command, workingDirectory }) => {
          if (command.includes("{ rg ")) {
            return Promise.resolve({
              exitCode: 0,
              stdout: "\n__ZO_SEARCH_EXIT__:127\n",
              stderr: "sh: rg: not found",
            });
          }
          return depSession.run({ command, ...(workingDirectory !== undefined ? { workingDirectory } : {}) });
        },
      };
      const fallbackIo = createSandboxIo({ root: depRoot, session: () => Promise.resolve(noRg) });
      const viaGrep = await fallbackIo.search({ pattern: "needle", ignoreCase: false, maxMatches: 10 });
      expect(viaGrep.matches.map((m) => m.file)).toEqual(["app.ts"]);
    } finally {
      rmSync(depRoot, { recursive: true, force: true });
    }
  });

  test("search scopes to a file and honors ignore_case", async () => {
    const scoped = await io.search({
      pattern: "BETA",
      ignoreCase: true,
      scope: join(root, "hello.txt"),
      maxMatches: 10,
    });
    expect(scoped.matches).toEqual([{ file: "hello.txt", line: 2, text: "beta" }]);
  });

  test("search stops at the total cap", async () => {
    const result = await io.search({
      pattern: "^(alpha|beta|gamma)$",
      ignoreCase: false,
      scope: join(root, "hello.txt"),
      maxMatches: 2,
    });
    expect(result.matches).toHaveLength(2);
    expect(result.stopped).toBe("max-matches");
  });

  test("search falls back to grep when rg is missing", async () => {
    // A session whose shell has no rg on PATH: emulate the wrapped command's
    // shape — the shell still runs, rg exits 127, the sentinel reports it.
    const noRg: SandboxSessionLike = {
      ...session,
      run: ({ command, workingDirectory }) => {
        if (command.includes("{ rg ")) {
          return Promise.resolve({
            exitCode: 0,
            stdout: "\n__ZO_SEARCH_EXIT__:127\n",
            stderr: "sh: rg: not found",
          });
        }
        return session.run({ command, ...(workingDirectory !== undefined ? { workingDirectory } : {}) });
      },
    };
    const fallbackIo = createSandboxIo({ root, session: () => Promise.resolve(noRg) });
    const result = await fallbackIo.search({
      pattern: "answer = [0-9]+",
      ignoreCase: false,
      maxMatches: 10,
    });
    expect(result.matches).toEqual([
      { file: "src/app.ts", line: 1, text: "export const answer = 42;" },
    ]);
  });

  test("a real search error surfaces with stderr context", () => {
    const broken: SandboxSessionLike = {
      ...session,
      run: () =>
        Promise.resolve({
          exitCode: 0,
          stdout: "\n__ZO_SEARCH_EXIT__:2\n",
          stderr: "regex parse error",
        }),
    };
    const brokenIo = createSandboxIo({ root, session: () => Promise.resolve(broken) });
    expect(
      brokenIo.search({ pattern: "x", ignoreCase: false, maxMatches: 5 }),
    ).rejects.toThrow(/regex parse error/);
  });

  test("the grep fallback honors the root .gitignore and skips dependency dirs", async () => {
    const giRoot = realpathSync(mkdtempSync(join(tmpdir(), "agent-sdk-sbio-gigrep-")));
    try {
      mkdirSync(join(giRoot, "dist"), { recursive: true });
      mkdirSync(join(giRoot, "node_modules/dep"), { recursive: true });
      writeFileSync(join(giRoot, ".gitignore"), "dist/\n");
      writeFileSync(join(giRoot, "src.ts"), "needle here\n");
      writeFileSync(join(giRoot, "dist/out.js"), "needle built\n");
      writeFileSync(join(giRoot, "node_modules/dep/index.js"), "needle dep\n");
      const real = createFakeSandboxSession(giRoot);
      const noRg: SandboxSessionLike = {
        ...real,
        run: ({ command, workingDirectory }) => {
          if (command.includes("{ rg ")) {
            return Promise.resolve({
              exitCode: 0,
              stdout: "\n__ZO_SEARCH_EXIT__:127\n",
              stderr: "sh: rg: not found",
            });
          }
          return real.run({ command, ...(workingDirectory !== undefined ? { workingDirectory } : {}) });
        },
      };
      const fallbackIo = createSandboxIo({ root: giRoot, session: () => Promise.resolve(noRg) });
      const result = await fallbackIo.search({
        pattern: "needle",
        ignoreCase: false,
        maxMatches: 10,
      });
      expect(result.matches.map((m) => m.file)).toEqual(["src.ts"]);

      // Ignored matches must not consume the match budget: `dist/` sorts
      // before `src.ts` in grep's traversal, yet a cap of 1 still returns
      // the tracked file.
      const capped = await fallbackIo.search({
        pattern: "needle",
        ignoreCase: false,
        maxMatches: 1,
      });
      expect(capped.matches.map((m) => m.file)).toEqual(["src.ts"]);
      expect(capped.stopped).toBe("max-matches");

      // The size skip holds without rg: an oversized matching file is
      // ignored by the find-driven fallback.
      writeFileSync(join(giRoot, "huge.txt"), `needle huge\n${"x".repeat(2_000_000)}\n`);
      const sized = await fallbackIo.search({
        pattern: "needle",
        ignoreCase: false,
        maxMatches: 10,
      });
      expect(sized.matches.map((m) => m.file)).toEqual(["src.ts"]);

      // Globs use the local backend's semantics, path globs included.
      mkdirSync(join(giRoot, "sub/deep"), { recursive: true });
      writeFileSync(join(giRoot, "sub/deep/a.ts"), "needle glob\n");
      writeFileSync(join(giRoot, "sub/deep/a.md"), "needle glob\n");
      const globbed = await fallbackIo.search({
        pattern: "needle",
        ignoreCase: false,
        glob: "sub/**/*.ts",
        maxMatches: 10,
      });
      expect(globbed.matches.map((m) => m.file)).toEqual(["sub/deep/a.ts"]);
    } finally {
      rmSync(giRoot, { recursive: true, force: true });
    }
  });

  test("the grep fallback rejects when cancellation arrives during the ignore read", async () => {
    const controller = new AbortController();
    let markStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    let finish: ((value: Uint8Array | null) => void) | undefined;
    const reading = new Promise<Uint8Array | null>((resolve) => {
      finish = resolve;
    });
    const noRg: SandboxSessionLike = {
      ...session,
      run: ({ command, workingDirectory }) => {
        if (command.includes("{ rg ")) {
          return Promise.resolve({
            exitCode: 0,
            stdout: "\n__ZO_SEARCH_EXIT__:127\n",
            stderr: "sh: rg: not found",
          });
        }
        return session.run({
          command,
          ...(workingDirectory !== undefined ? { workingDirectory } : {}),
        });
      },
      readBinaryFile: () => {
        markStarted?.();
        return reading;
      },
    };
    const cancelled = createSandboxIo({
      root,
      abortSignal: controller.signal,
      session: () => Promise.resolve(noRg),
    });
    const pending = cancelled.search({
      pattern: "alpha",
      ignoreCase: false,
      maxMatches: 5,
    });
    await started;
    controller.abort(new Error("turn cancelled"));
    finish?.(null);
    await expect(pending).rejects.toThrow("turn cancelled");
  });

  test("a byte-capped (flooded) search returns what it got, marked stopped", async () => {
    // head cut the stream: no sentinel, clean shell exit.
    const flooding: SandboxSessionLike = {
      ...session,
      run: () =>
        Promise.resolve({
          exitCode: 0,
          stdout: "a.txt:1:x\na.txt:2:y\na.txt:3:tr", // truncated mid-line
          stderr: "",
        }),
    };
    const floodedIo = createSandboxIo({ root, session: () => Promise.resolve(flooding) });
    const result = await floodedIo.search({ pattern: "x", ignoreCase: false, maxMatches: 100 });
    expect(result.stopped).toBe("output-cap");
    expect(result.matches.length).toBeGreaterThan(0);
  });

  test("search commands carry the byte cap and the file-size cap", async () => {
    const seen: string[] = [];
    const spying: SandboxSessionLike = {
      ...session,
      run: ({ command, workingDirectory }) => {
        seen.push(command);
        return session.run({ command, ...(workingDirectory !== undefined ? { workingDirectory } : {}) });
      },
    };
    const spyIo = createSandboxIo({ root, session: () => Promise.resolve(spying) });
    await spyIo.search({ pattern: "alpha", ignoreCase: false, maxMatches: 5 });
    const command = seen[0] ?? "";
    expect(command).toContain(`head -c ${SEARCH_OUTPUT_CAP_BYTES}`);
    expect(command).toContain("--max-filesize");
  });

  test("the find fallback honors the root .gitignore", async () => {
    const giRoot = realpathSync(mkdtempSync(join(tmpdir(), "agent-sdk-sbio-gi-")));
    try {
      mkdirSync(join(giRoot, "dist"), { recursive: true });
      writeFileSync(join(giRoot, ".gitignore"), "dist/\n*.log\n");
      writeFileSync(join(giRoot, "keep.ts"), "keep\n");
      writeFileSync(join(giRoot, "debug.log"), "noise\n");
      writeFileSync(join(giRoot, "dist/out.js"), "built\n");
      const giIo = createSandboxIo({
        root: giRoot,
        session: () => Promise.resolve(createFakeSandboxSession(giRoot)),
      });
      const files = [...(await giIo.listFiles())];
      expect(files).toContain("keep.ts");
      expect(files).toContain(".gitignore");
      expect(files).not.toContain("debug.log");
      expect(files).not.toContain("dist/out.js");
    } finally {
      rmSync(giRoot, { recursive: true, force: true });
    }
  });

  test("the session resolves lazily and once per IO", async () => {
    let resolutions = 0;
    const lazyIo = createSandboxIo({
      root,
      session: () => {
        resolutions += 1;
        return Promise.resolve(session);
      },
    });
    expect(resolutions).toBe(0);
    await lazyIo.readFile(join(root, "hello.txt"));
    await lazyIo.stat(join(root, "hello.txt"));
    expect(resolutions).toBe(1);
  });

  test("sandboxIoProvider resolves the session from ctx.getSandbox", async () => {
    let asked = 0;
    const provider = sandboxIoProvider({ root });
    const ctx = {
      abortSignal: new AbortController().signal,
      callId: "call-1",
      getSandbox: () => {
        asked += 1;
        return Promise.resolve(session);
      },
    };
    const bytes = await provider(ctx).readFile(join(root, "hello.txt"));
    expect(bytes?.toString("utf8")).toContain("alpha");
    expect(asked).toBe(1);
  });

  test("sandboxIoProvider without a ctx fails with a clear error", async () => {
    const provider = sandboxIoProvider({ root });
    expect(provider(undefined).readFile(join(root, "hello.txt"))).rejects.toThrow(
      /need an eve tool context/,
    );
  });
});

describe("shellSingleQuote", () => {
  test("wraps and escapes single quotes", () => {
    expect(shellSingleQuote("plain")).toBe("'plain'");
    expect(shellSingleQuote("it's")).toBe(`'it'\\''s'`);
    // Round-trips through a real shell.
    const echoed = spawnSync("/bin/sh", ["-c", `printf %s ${shellSingleQuote("a'b\"c$d")}`], {
      encoding: "utf8",
    });
    expect(echoed.stdout).toBe(`a'b"c$d`);
  });
});

describe("extractSearchExit", () => {
  test("splits the trailing sentinel from the output", () => {
    expect(extractSearchExit("a.ts:1:x\n\n__ZO_SEARCH_EXIT__:0\n")).toEqual({
      stdout: "a.ts:1:x\n",
      exitCode: 0,
    });
    expect(extractSearchExit("\n__ZO_SEARCH_EXIT__:127\n")).toEqual({
      stdout: "",
      exitCode: 127,
    });
  });

  test("null when the sentinel is missing (capped stream)", () => {
    expect(extractSearchExit("a.ts:1:x\na.ts:2:tru")).toEqual({
      stdout: "a.ts:1:x\na.ts:2:tru",
      exitCode: null,
    });
  });

  test("a sentinel-looking line mid-output does not match", () => {
    const out = "a.ts:1:__ZO_SEARCH_EXIT__:9\nb.ts:2:y\n\n__ZO_SEARCH_EXIT__:0\n";
    expect(extractSearchExit(out).exitCode).toBe(0);
    expect(extractSearchExit(out).stdout).toContain("b.ts:2:y");
  });
});

describe("parseSearchOutput", () => {
  test("parses file:line:text, stripping ./ prefixes", () => {
    const out = "./src/a.ts:3:const x = 1;\nsrc/b.ts:10:more\n";
    const result = parseSearchOutput(out, 10);
    expect(result.matches).toEqual([
      { file: "src/a.ts", line: 3, text: "const x = 1;" },
      { file: "src/b.ts", line: 10, text: "more" },
    ]);
    expect(result.stopped).toBe(false);
  });

  test("skips non-match lines (separators, binary notices)", () => {
    const out = "--\nBinary file blob.bin matches\nsrc/a.ts:1:x\n";
    expect(parseSearchOutput(out, 10).matches).toHaveLength(1);
  });

  test("stops at the cap and says so", () => {
    const out = Array.from({ length: 5 }, (_, i) => `f.txt:${i + 1}:line`).join("\n");
    const result = parseSearchOutput(out, 3);
    expect(result.matches).toHaveLength(3);
    expect(result.stopped).toBe("max-matches");
  });

  test("a flood outranks the match cap — the cut stream is the stronger claim", () => {
    const out = Array.from({ length: 5 }, (_, i) => `f.txt:${i + 1}:line`).join("\n");
    const result = parseSearchOutput(out, 3, true);
    expect(result.matches).toHaveLength(3);
    expect(result.stopped).toBe("output-cap");
  });

  test("keeps text containing colons intact", () => {
    const result = parseSearchOutput("a.ts:1:const url = 'http://x';\n", 10);
    expect(result.matches[0]?.text).toBe("const url = 'http://x';");
  });

  test("parses a CRLF-terminated match line (trailing \\r trimmed off text)", () => {
    const result = parseSearchOutput("src/a.ts:3:const x = 1;\r\n", 10);
    expect(result.matches).toEqual([{ file: "src/a.ts", line: 3, text: "const x = 1;" }]);
  });

  test("stays linear on a long line the old regex backtracked on", () => {
    // The old `/^(.+?):(\d+):(.*)$/` was polynomial here: the trailing `\r`
    // can never satisfy `$` (JS `.` excludes `\r`), so the lazy `.+?`/`\d+`
    // backtracked quadratically. A crafted line near runSearch's byte cap ran
    // for minutes; this must be instant. `"a:0:"×N` still matches at the first
    // `:0:`, so file="a", line=0, and the rest is text.
    const body = "a:0:".repeat(200_000);
    const start = performance.now();
    const result = parseSearchOutput(`${body}\r\n`, 10);
    expect(performance.now() - start).toBeLessThan(100);
    expect(result.matches[0]?.file).toBe("a");
    expect(result.matches[0]?.line).toBe(0);
    expect(result.matches[0]?.text).toBe(body.slice(4));
  });
});
