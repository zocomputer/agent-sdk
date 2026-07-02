import { spawnSync } from "node:child_process";

// Comfortably holds even a huge repo's NUL-delimited path list.
const MAX_BUFFER = 64 * 1024 * 1024;

function gitPaths(root: string, args: string[]): string[] | null {
  const res = spawnSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: MAX_BUFFER });
  if (res.error || res.status !== 0) return null;
  return res.stdout.split("\0").filter((path) => path.length > 0);
}

/**
 * Candidate file list for glob/grep: one `git ls-files` spawn (tens of ms)
 * with exact .gitignore semantics, instead of a hand-rolled walk that has to
 * keep its own ignore list in sync (and used to read 2.6 GB of Rust build
 * output per unscoped grep). Returns repo-root-relative, forward-slash paths —
 * git's native output shape. `scope` (a repo-relative directory) narrows the
 * listing via a git pathspec. Returns null when git can't answer (not a repo,
 * git missing), so callers fall back to `walkFiles`.
 */
export function listGitFiles(root: string, scope?: string): string[] | null {
  const spec = scope !== undefined && scope !== "." ? ["--", scope] : [];
  const files = gitPaths(root, [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
    ...spec,
  ]);
  if (files === null) return null;
  // `--cached` still lists a tracked file after an un-staged `rm`; subtract
  // those so we never hand back a path that isn't on disk. If this follow-up
  // fails (it shouldn't — the primary listing just proved git works here),
  // return the unfiltered list rather than null: a few stale just-deleted
  // paths beat throwing away a valid answer and re-walking the whole tree.
  const deleted = gitPaths(root, ["ls-files", "--deleted", "-z", ...spec]);
  if (deleted === null || deleted.length === 0) return files;
  const gone = new Set(deleted);
  return files.filter((path) => !gone.has(path));
}
