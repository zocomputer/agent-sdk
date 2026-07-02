import { afterAll, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listGitFiles } from "./list-files";

const created: string[] = [];
afterAll(() => {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "rib-list-files-"));
  created.push(dir);
  return dir;
}

function git(cwd: string, ...args: string[]): void {
  const res = spawnSync("git", args, { cwd });
  if (res.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${res.stderr}`);
}

// A staged (`git add`) index is enough for ls-files — no commit, so tests
// need no user.name/email config.
function makeRepo(): string {
  const dir = tempDir();
  git(dir, "init", "-q");
  writeFileSync(join(dir, ".gitignore"), "*.log\nbuild/\n");
  writeFileSync(join(dir, "tracked.ts"), "export {};\n");
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "src", "nested.ts"), "export {};\n");
  git(dir, "add", ".gitignore", "tracked.ts", "src/nested.ts");
  writeFileSync(join(dir, "untracked.ts"), "export {};\n");
  writeFileSync(join(dir, "debug.log"), "ignored\n");
  mkdirSync(join(dir, "build"));
  writeFileSync(join(dir, "build", "out.js"), "ignored\n");
  return dir;
}

test("lists tracked and untracked files, skipping gitignored ones", () => {
  const dir = makeRepo();
  const files = listGitFiles(dir);
  expect(files).not.toBeNull();
  expect(files?.sort()).toEqual([".gitignore", "src/nested.ts", "tracked.ts", "untracked.ts"]);
});

test("scope narrows the listing to a directory", () => {
  const dir = makeRepo();
  expect(listGitFiles(dir, "src")).toEqual(["src/nested.ts"]);
});

test("a '.' scope means the whole repo", () => {
  const dir = makeRepo();
  expect(listGitFiles(dir, ".")?.sort()).toEqual(listGitFiles(dir)?.sort());
});

test("a tracked file deleted from disk is not listed", () => {
  const dir = makeRepo();
  unlinkSync(join(dir, "tracked.ts"));
  const files = listGitFiles(dir);
  expect(files).not.toBeNull();
  expect(files).not.toContain("tracked.ts");
  expect(files).toContain("src/nested.ts");
});

test("returns null outside a git repo", () => {
  expect(listGitFiles(tempDir())).toBeNull();
});
