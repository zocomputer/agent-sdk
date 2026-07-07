import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { globToRegExp } from "./glob-match";
import { listGitFiles } from "./list-files";
import { readTextForSearch } from "./read-text";
import { walkFiles } from "./walk";
import { relativizeWithin } from "./workspace";

// The I/O seam under every stdlib file tool. Tools do path math through
// `Workspace` (pure) and effects through a `WorkspaceIO` — so the same
// read/edit/write/glob/grep factories run against the harness process's own
// disk (rib, the coder example) or a remote eve sandbox (hosted agents, where
// the eve process and the workspace are different machines — see
// ./sandbox-io.ts). The local backend lives here; it is exactly the node:fs +
// `git ls-files` + in-process-scan behavior the tools shipped with.
//
// A sandbox arrives per tool call (eve's `ctx.getSandbox()`), not per factory
// build, so tools hold a `WorkspaceIoProvider` — `(ctx) => WorkspaceIO` — and
// resolve it at the top of each execute. The local provider ignores `ctx`
// entirely; the tools' no-session usability (direct factory calls in tests)
// is preserved.

/** Stat result for one path. */
export interface IoStat {
  readonly isFile: boolean;
  readonly size: number;
  readonly mtimeMs: number;
}

/** One matching line from a content search. `file` is workspace-root-relative. */
export interface IoSearchMatch {
  readonly file: string;
  readonly line: number;
  readonly text: string;
}

/**
 * Content-search parameters: regex pattern, case-sensitivity, scope, glob
 * filter, and max-match bound.
 */
export interface IoSearchOptions {
  /** JavaScript regex source. The tool validates it before calling. */
  readonly pattern: string;
  readonly ignoreCase: boolean;
  /**
   * Absolute file or directory to search. The whole workspace when omitted.
   * Callers stat the scope first, so it exists.
   */
  readonly scope?: string | undefined;
  /** Filename glob filter over root-relative paths (e.g. `**​/*.ts`). */
  readonly glob?: string | undefined;
  /** Stop scanning once this many matching lines have been collected. */
  readonly maxMatches: number;
}

/**
 * Content-search result: matched lines, a stop reason (false if complete), and
 * the count of files skipped for size.
 */
export interface IoSearchResult {
  readonly matches: readonly IoSearchMatch[];
  /**
   * Why the scan ended early, or `false` when it covered everything:
   * `"max-matches"` = the `maxMatches` bound; `"output-cap"` = a remote
   * backend's byte cap cut the stream mid-scan (fewer than `maxMatches`
   * lines were parsed, and more may exist).
   */
  readonly stopped: false | "max-matches" | "output-cap";
  /**
   * Files skipped for being over the search size cap, or `null` when the
   * backend can't know (a remote searcher enforces the cap but doesn't
   * report a count). Consumers must omit the figure rather than show 0.
   */
  readonly skippedLargeFiles: number | null;
}

/**
 * Byte-oriented workspace effects, async so a remote backend fits. All paths
 * are absolute (already resolved through `Workspace`); returned file lists
 * and match paths are workspace-root-relative with forward slashes.
 */
export interface WorkspaceIO {
  /** Stat one path; `null` when it doesn't exist. */
  stat(abs: string): Promise<IoStat | null>;
  /** Read one file's bytes; `null` when it doesn't exist. */
  readFile(abs: string): Promise<Buffer | null>;
  /** Write one file, creating parent directories and overwriting. */
  writeFile(abs: string, content: string | Uint8Array): Promise<void>;
  /**
   * Candidate file paths for glob/grep — root-relative, gitignore-aware.
   * `scope` (absolute directory) narrows the listing.
   */
  listFiles(scope?: string): Promise<Iterable<string>>;
  /** Regex content search, backend-native (in-process locally, rg/grep remotely). */
  search(options: IoSearchOptions): Promise<IoSearchResult>;
}

/**
 * The slice of eve's `SandboxSession` the sandbox backend needs, declared
 * structurally so lib modules stay framework-free (eve's type satisfies it).
 * Shapes mirror the AI SDK sandbox surface: reads resolve `null` for a
 * missing file, writes create parent directories.
 */
export interface SandboxSessionLike {
  /** Read a file's bytes; null when it doesn't exist. */
  readonly readBinaryFile: (options: {
    path: string;
  }) => PromiseLike<Uint8Array | null>;
  /** Write a file, creating parent directories and overwriting. */
  readonly writeBinaryFile: (options: {
    path: string;
    content: Uint8Array;
  }) => PromiseLike<void>;
  /** Run a shell command and wait for its completion. */
  readonly run: (options: {
    command: string;
    workingDirectory?: string;
  }) => PromiseLike<{ exitCode: number; stdout: string; stderr: string }>;
}

/**
 * The slice of eve's `ToolContext` an IO provider may use. Structural, so
 * tools can hand their eve context straight through without the lib importing
 * `eve/*`. The session id is exposed for `resolveSession` hooks that run
 * per-session setup (the Builder's workspace bootstrap keys on it).
 */
export interface IoToolContext {
  readonly session?: { readonly id: string };
  /** Resolve the sandbox session for the current tool call. */
  getSandbox(): PromiseLike<SandboxSessionLike>;
}

/**
 * Resolves the IO for one tool call. The local provider ignores `ctx`; the
 * sandbox provider (see ./sandbox-io.ts) resolves `ctx.getSandbox()` lazily,
 * so constructing the IO never touches the session.
 */
export type WorkspaceIoProvider = (ctx: IoToolContext | undefined) => WorkspaceIO;

/** The local backend: node:fs against the harness process's own disk. */
export function createLocalIo(root: string): WorkspaceIO {
  return {
    async stat(abs) {
      try {
        const st = statSync(abs);
        return { isFile: st.isFile(), size: st.size, mtimeMs: st.mtimeMs };
      } catch {
        return null;
      }
    },
    async readFile(abs) {
      try {
        return readFileSync(abs);
      } catch (err) {
        if (isMissingFileError(err)) return null;
        throw err;
      }
    },
    async writeFile(abs, content) {
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, content);
    },
    async listFiles(scope) {
      if (scope === undefined) {
        return listGitFiles(root) ?? walkFiles(root);
      }
      const rel = relativizeWithin(root, scope);
      return listGitFiles(root, rel) ?? walkFiles(scope, root);
    },
    async search(options) {
      return searchLocal(root, options);
    },
  };
}

/** A provider over one shared local IO — every call gets the same instance. */
export function localIoProvider(root: string): WorkspaceIoProvider {
  const io = createLocalIo(root);
  return () => io;
}

function isMissingFileError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "ENOENT"
  );
}

/** The in-process scan the local grep has always run; exported for tests. */
export async function searchLocal(
  root: string,
  options: IoSearchOptions,
): Promise<IoSearchResult> {
  const re = new RegExp(options.pattern, options.ignoreCase ? "i" : "");
  const globRe = options.glob ? globToRegExp(options.glob) : null;

  let candidates: Iterable<string>;
  if (options.scope !== undefined) {
    const rel = relativizeWithin(root, options.scope);
    let isFile = false;
    try {
      isFile = statSync(options.scope).isFile();
    } catch {
      isFile = false;
    }
    candidates = isFile
      ? [rel]
      : (listGitFiles(root, rel) ?? walkFiles(options.scope, root));
  } else {
    candidates = listGitFiles(root) ?? walkFiles(root);
  }

  const matches: IoSearchMatch[] = [];
  let stopped: false | "max-matches" = false;
  let skippedLargeFiles = 0;
  scan: for (const file of candidates) {
    if (globRe && !globRe.test(file)) continue;
    const read = readTextForSearch(join(root, file));
    if (read.kind === "too-large") {
      skippedLargeFiles += 1;
      continue;
    }
    if (read.kind !== "text") continue;
    const lines = read.content.split("\n");
    for (const [index, line] of lines.entries()) {
      if (!re.test(line)) continue;
      matches.push({ file, line: index + 1, text: line });
      if (matches.length >= options.maxMatches) {
        stopped = "max-matches";
        break scan;
      }
    }
  }
  return { matches, stopped, skippedLargeFiles };
}
