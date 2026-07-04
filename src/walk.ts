import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import ignore, { type Ignore } from "ignore";

// The *fallback* candidate source — `listGitFiles` (git's own ignore
// semantics) is preferred — so it honors `.gitignore` files itself (root,
// nested, and ancestors between `base` and `root` for scoped walks) rather
// than duplicating the repo's ignore list here. The hardcoded set is only a
// safety net for trees with no `.gitignore` at all: VCS stores plus the one
// universally-huge dependency dir. Exported so the sandbox search backend
// (../sandbox-io.ts) applies the same unconditional skips — the two backends
// must not drift on what a search can wander into.
export const ALWAYS_IGNORED = new Set([".git", ".jj", ".hg", ".svn", "node_modules"]);

// One .gitignore's matcher, scoped to the directory that holds it. `prefix` is
// that directory relative to the walk base (forward-slash, "" for the base
// itself); patterns only apply to paths under it. Matching is delegated to the
// `ignore` npm package (the battle-tested matcher ESLint/Prettier use), so we
// get the full gitignore spec — escapes and all — instead of maintaining one.
type ScopedIgnore = { prefix: string; matcher: Ignore };

// Read `<absDir>/.gitignore` into a scope. Null when absent or unreadable —
// callers just skip pushing a scope.
function loadGitignore(absDir: string, prefix: string): ScopedIgnore | null {
  let text: string;
  try {
    text = readFileSync(join(absDir, ".gitignore"), "utf8");
  } catch {
    return null;
  }
  return { prefix, matcher: ignore().add(text) };
}

// Git-style decision for a base-relative, forward-slash path: evaluate every
// scope whose directory contains the path (callers pass them outer→inner) and
// let the innermost explicit verdict — ignore or `!` re-include — win. A
// trailing slash tells the matcher "directory", so dir-only patterns (`out/`)
// apply. Files under an ignored directory never get here — the walker prunes
// the directory, matching git's "can't re-include under an excluded dir" rule.
function isIgnored(scopes: readonly ScopedIgnore[], relPath: string, isDir: boolean): boolean {
  let ignored = false;
  for (const scope of scopes) {
    let sub: string;
    if (scope.prefix === "") sub = relPath;
    else if (relPath.startsWith(`${scope.prefix}/`)) sub = relPath.slice(scope.prefix.length + 1);
    else continue;
    const verdict = scope.matcher.test(isDir ? `${sub}/` : sub);
    if (verdict.ignored) ignored = true;
    else if (verdict.unignored) ignored = false;
  }
  return ignored;
}

type Frame = {
  dir: string; // absolute
  rel: string; // base-relative, forward-slash ("" for base itself)
  scopes: ScopedIgnore[]; // .gitignore scopes from ancestors (not `dir` itself)
};

// Depth-first walk yielding `base`-relative, forward-slash file paths. glob
// and grep run in-process (no ripgrep dependency), so this is deliberately
// modest — it exists to serve interactive searches, not to index the world.
// `base` defaults to `root` for whole-workspace walks; a scoped walk passes
// the subtree as `root` and the workspace as `base` so paths stay
// base-relative and ancestor .gitignores still apply.
export function* walkFiles(root: string, base: string = root): Generator<string> {
  // Ancestor .gitignore chain: when walking a subtree, patterns from `base`
  // down to `root`'s parent still apply to it (git semantics). `root`'s own
  // .gitignore loads when its frame is processed, like every other dir.
  const scopes: ScopedIgnore[] = [];
  const relRoot = relative(base, root).split(sep).join("/");
  if (relRoot !== "" && !relRoot.startsWith("..")) {
    let absDir = base;
    let prefix = "";
    const own = loadGitignore(base, "");
    if (own !== null) scopes.push(own);
    const segments = relRoot.split("/");
    for (const segment of segments.slice(0, -1)) {
      absDir = join(absDir, segment);
      prefix = prefix === "" ? segment : `${prefix}/${segment}`;
      const scope = loadGitignore(absDir, prefix);
      if (scope !== null) scopes.push(scope);
    }
  }

  const stack: Frame[] = [{ dir: root, rel: relRoot === "." ? "" : relRoot, scopes }];
  while (stack.length > 0) {
    const frame = stack.pop();
    if (frame === undefined) break;
    let entries;
    try {
      entries = readdirSync(frame.dir, { withFileTypes: true });
    } catch {
      continue;
    }
    const own = loadGitignore(frame.dir, frame.rel);
    const active = own === null ? frame.scopes : [...frame.scopes, own];
    for (const entry of entries) {
      const rel = frame.rel === "" ? entry.name : `${frame.rel}/${entry.name}`;
      if (entry.isDirectory()) {
        if (ALWAYS_IGNORED.has(entry.name)) continue;
        if (isIgnored(active, rel, true)) continue;
        stack.push({ dir: join(frame.dir, entry.name), rel, scopes: active });
      } else if (entry.isFile()) {
        // In a linked worktree `.git` is a file (a gitdir pointer), not a dir.
        if (entry.name === ".git") continue;
        if (isIgnored(active, rel, false)) continue;
        yield rel;
      }
    }
  }
}
