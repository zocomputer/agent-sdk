import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ToolContext } from "eve/tools";
import { createWorkspace } from "../workspace";
import { createLocalIo, type WorkspaceIoProvider } from "../workspace-io";
import { createGrepTool, GREP_SPILL_MAX_MATCHES } from "./grep";

// Temp workspace (not a git repo, so candidates come from the walk fallback).
// realpath because macOS's tmpdir is a /private symlink and workspace paths
// must be canonical.
const root = realpathSync(mkdtempSync(join(tmpdir(), "agent-sdk-grep-")));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const spillDir = join(root, ".agent", "tool-outputs");
const workspace = createWorkspace(root);

// grep never touches the eve session context; a stub that throws on every
// capability keeps that honest without an `as`-cast.
const ctx: ToolContext = {
  session: {
    id: "grep-test",
    auth: { current: null, initiator: null },
    turn: { id: "turn-1", sequence: 1 },
  },
  getSandbox: () => Promise.reject(new Error("no sandbox in tests")),
  getSkill: () => {
    throw new Error("no skills in tests");
  },
  getToken: () => Promise.reject(new Error("no auth in tests")),
  requireAuth: () => {
    throw new Error("no auth in tests");
  },
};

// 500 matching lines across two files, plus one non-matching line.
writeFileSync(
  join(root, "many-a.txt"),
  Array.from({ length: 300 }, (_, i) => `needle line ${i}`).join("\n") + "\nhay\n",
);
writeFileSync(
  join(root, "many-b.txt"),
  Array.from({ length: 200 }, (_, i) => `needle line ${300 + i}`).join("\n") + "\n",
);
writeFileSync(join(root, "few.txt"), "needle once\nhay\n");

const spillLines = (path: string): string[] =>
  readFileSync(path, "utf8").trimEnd().split("\n");

describe("grep overflow spill", () => {
  test("overflow keeps scanning, spills the complete list, and names it in the note", async () => {
    const grep = createGrepTool({ workspace, noun: "repo", spillDir });
    const result = await grep.execute(
      { pattern: "^needle", glob: "many-*.txt", max_results: 50 },
      ctx,
    );
    expect(result).toMatchObject({ truncated: true, count: 50, totalMatches: 500 });
    expect(result.matches).toHaveLength(50);
    if (result.note === undefined) throw new Error("expected a note");
    expect(result.note).toContain("Found 500 matching lines");
    expect(result.note).toContain("showing the first 50 here");

    // The note names a workspace-relative spill file holding every match.
    const match = result.note.match(/at (\S+) —/);
    if (!match?.[1]) throw new Error(`note names no spill file: ${result.note}`);
    const lines = spillLines(workspace.resolve(match[1]));
    expect(lines).toHaveLength(500);
    expect(lines[0]).toMatch(/^many-a\.txt:1: needle line 0$/);
    expect(lines[499]).toMatch(/^many-b\.txt:200: needle line 499$/);
  });

  test("an under-cap search writes no spill file", async () => {
    const freshSpillDir = join(root, ".agent", "fresh-outputs");
    const grep = createGrepTool({ workspace, noun: "repo", spillDir: freshSpillDir });
    const result = await grep.execute({ pattern: "^needle", path: "few.txt" }, ctx);
    expect(result).toMatchObject({ truncated: false, count: 1 });
    expect(existsSync(freshSpillDir)).toBe(false);
  });

  test("without a spillDir the scan stops at the cap, as before", async () => {
    const grep = createGrepTool({ workspace, noun: "repo" });
    const result = await grep.execute(
      { pattern: "^needle", glob: "many-*.txt", max_results: 50 },
      ctx,
    );
    expect(result).toMatchObject({ truncated: true, count: 50 });
    expect("totalMatches" in result).toBe(false);
    if (result.note === undefined) throw new Error("expected a note");
    expect(result.note).toContain("more matches may exist");
    expect(grep.description).not.toContain("saved to a file");
  });

  test("description advertises the spill recovery path only when spilling is on", () => {
    const withSpill = createGrepTool({ workspace, noun: "repo", spillDir });
    expect(withSpill.description).toContain("saved to a file");
  });

  test("a spilled scan stops at the hard bound", async () => {
    const bigRoot = realpathSync(mkdtempSync(join(tmpdir(), "agent-sdk-grep-big-")));
    try {
      const count = GREP_SPILL_MAX_MATCHES + 100;
      writeFileSync(
        join(bigRoot, "huge.txt"),
        Array.from({ length: count }, (_, i) => `needle ${i}`).join("\n") + "\n",
      );
      const bigSpillDir = join(bigRoot, "outputs");
      const grep = createGrepTool({
        workspace: createWorkspace(bigRoot),
        noun: "repo",
        spillDir: bigSpillDir,
      });
      const result = await grep.execute({ pattern: "^needle", max_results: 10 }, ctx);
      expect(result).toMatchObject({
        truncated: true,
        count: 10,
        totalMatches: GREP_SPILL_MAX_MATCHES,
      });
      if (result.note === undefined) throw new Error("expected a note");
      expect(result.note).toContain(`Stopped scanning at ${GREP_SPILL_MAX_MATCHES} matching lines`);
      // A hard-bound spill is not exhaustive; the pointer must not say so.
      expect(result.note).not.toContain("complete list");
      expect(result.note).toContain("matches collected so far are at");
      const match = result.note.match(/at (\S+) —/);
      if (!match?.[1]) throw new Error(`note names no spill file: ${result.note}`);
      expect(spillLines(join(bigRoot, match[1]))).toHaveLength(GREP_SPILL_MAX_MATCHES);
    } finally {
      rmSync(bigRoot, { recursive: true, force: true });
    }
  });

  test("a scan stopped at the hard bound never claims completeness, even under max_results", async () => {
    const bigRoot = realpathSync(mkdtempSync(join(tmpdir(), "agent-sdk-grep-bound-")));
    try {
      const count = GREP_SPILL_MAX_MATCHES + 100;
      writeFileSync(
        join(bigRoot, "huge.txt"),
        Array.from({ length: count }, (_, i) => `needle ${i}`).join("\n") + "\n",
      );
      const bigWorkspace = createWorkspace(bigRoot);

      // With a spill dir: everything found fits under max, but the scan
      // stopped early — the result must say so and still spill.
      const withSpill = createGrepTool({
        workspace: bigWorkspace,
        noun: "repo",
        spillDir: join(bigRoot, "outputs"),
      });
      const spilled = await withSpill.execute(
        { pattern: "^needle", max_results: GREP_SPILL_MAX_MATCHES },
        ctx,
      );
      expect(spilled).toMatchObject({
        truncated: true,
        count: GREP_SPILL_MAX_MATCHES,
        totalMatches: GREP_SPILL_MAX_MATCHES,
      });
      if (spilled.note === undefined) throw new Error("expected a note");
      expect(spilled.note).toContain(`Stopped scanning at ${GREP_SPILL_MAX_MATCHES} matching lines`);
      const match = spilled.note.match(/at (\S+) —/);
      if (!match?.[1]) throw new Error(`note names no spill file: ${spilled.note}`);
      expect(spillLines(join(bigRoot, match[1]))).toHaveLength(GREP_SPILL_MAX_MATCHES);

      // Without a spill dir the bound still stops the scan; the result must
      // stay honest about it rather than reporting a complete count.
      const noSpill = createGrepTool({ workspace: bigWorkspace, noun: "repo" });
      const capped = await noSpill.execute(
        { pattern: "^needle", max_results: GREP_SPILL_MAX_MATCHES },
        ctx,
      );
      expect(capped).toMatchObject({ truncated: true, count: GREP_SPILL_MAX_MATCHES });
      if (capped.note === undefined) throw new Error("expected a note");
      expect(capped.note).toContain(`Stopped scanning at ${GREP_SPILL_MAX_MATCHES} matching lines`);
      expect(capped.note).toContain("Narrow with path/glob");
    } finally {
      rmSync(bigRoot, { recursive: true, force: true });
    }
  });

  test("a byte-capped remote scan is reported honestly, never as a complete list", async () => {
    // An IO whose search reports the remote transfer cap cut the stream.
    const local = createLocalIo(root);
    const floodIo: WorkspaceIoProvider = () => ({
      ...local,
      search: () =>
        Promise.resolve({
          matches: [
            { file: "few.txt", line: 1, text: "needle once" },
            { file: "many-a.txt", line: 1, text: "needle line 0" },
          ],
          stopped: "output-cap" as const,
          skippedLargeFiles: null,
        }),
    });
    const grep = createGrepTool({ workspace, noun: "repo", spillDir, io: floodIo });
    const result = await grep.execute({ pattern: "needle", max_results: 50 }, ctx);
    expect(result).toMatchObject({ truncated: true, count: 2, totalMatches: 2 });
    // The backend can't count size-skips remotely — no misleading 0.
    expect("skippedLargeFiles" in result).toBe(false);
    if (result.note === undefined) throw new Error("expected a note");
    expect(result.note).toContain("hit the transfer cap");
    expect(result.note).toContain("more matches may exist");
    expect(result.note).toContain("matches collected so far are at");
    expect(result.note).not.toContain("complete list");
  });

  test("a failed spill degrades to the capped result with narrow guidance", async () => {
    // The spill "directory" is an existing file, so mkdirSync fails.
    const blocker = join(root, "blocker");
    writeFileSync(blocker, "in the way");
    const grep = createGrepTool({
      workspace,
      noun: "repo",
      spillDir: join(blocker, "outputs"),
    });
    const result = await grep.execute(
      { pattern: "^needle", glob: "many-*.txt", max_results: 50 },
      ctx,
    );
    expect(result).toMatchObject({ truncated: true, count: 50, totalMatches: 500 });
    if (result.note === undefined) throw new Error("expected a note");
    expect(result.note).toContain("Narrow with path/glob");
    expect(result.note).not.toContain("The complete list is at");
  });
});
