import ignore from "ignore";
import { globToRegExp } from "./glob-match";
import { MAX_SEARCH_FILE_BYTES } from "./read-text";
import { ALWAYS_IGNORED } from "./walk";
import { relativizeWithin } from "./workspace";
import type {
  IoSearchMatch,
  IoSearchOptions,
  IoSearchResult,
  IoStat,
  IoToolContext,
  SandboxSessionLike,
  WorkspaceIO,
  WorkspaceIoProvider,
} from "./workspace-io";

// The sandbox backend for the WorkspaceIO seam (see ./workspace-io.ts): the
// same read/edit/write/glob/grep factories, but every effect goes through an
// eve `SandboxSession` — for the hosted topology where the eve process (a
// Vercel Function) and the workspace (a Daytona VM behind SSH) are different
// machines, so `node:fs` would read the wrong disk entirely.
//
// Byte I/O rides the session's `readBinaryFile`/`writeBinaryFile` (the same
// primitives eve's attachment staging uses); stat/list/search execute
// remotely via `run` so a search never pulls file contents over the wire.
// The session arrives per tool call (`ctx.getSandbox()`), so the provider
// builds one lazily-bound IO per call — constructing it touches nothing.
//
// Search-pattern caveat: the grep tool validates patterns as JavaScript
// regexes, but a sandbox search executes them with ripgrep (Rust regex) or,
// when rg is absent, POSIX `grep -E`. The common core (literals, classes,
// anchors, quantifiers, alternation) behaves identically; exotic JS features
// (lookbehind, \d in POSIX grep) may not. eve's built-in sandbox grep makes
// the same trade.

/** POSIX single-quoting for splicing untrusted strings into a shell command. */
export function shellSingleQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

/** Options for creating a sandbox-backed workspace I/O provider that executes file operations over an eve session sandbox. */
export interface SandboxIoOptions {
  /**
   * Absolute path of the workspace root **inside the sandbox** (e.g.
   * "/workspace", or the Builder's "/home/daytona/agent"). Must match the
   * root the tools' `Workspace` was created with.
   */
  root: string;
  /**
   * Resolves the sandbox session for one tool call. Defaults to
   * `ctx.getSandbox()` — the eve session sandbox. Injectable for tests and
   * for callers that hold a session some other way.
   */
  resolveSession?: (
    ctx: IoToolContext | undefined,
  ) => PromiseLike<SandboxSessionLike>;
}

function defaultResolveSession(
  ctx: IoToolContext | undefined,
): PromiseLike<SandboxSessionLike> {
  if (ctx === undefined) {
    throw new Error(
      "Sandbox-backed workspace tools need an eve tool context (ctx.getSandbox); none was provided.",
    );
  }
  return ctx.getSandbox();
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted !== true) return;
  if (signal.reason instanceof Error) throw signal.reason;
  throw new DOMException("The tool call was cancelled", "AbortError");
}

/**
 * A `WorkspaceIoProvider` over the session sandbox — pass as the `io` option
 * of the file-tool factories (or use `createSandboxFileTools`, which wires
 * the whole set).
 */
export function sandboxIoProvider(options: SandboxIoOptions): WorkspaceIoProvider {
  const resolve = options.resolveSession ?? defaultResolveSession;
  return (ctx) =>
    createSandboxIo({
      root: options.root,
      session: () => resolve(ctx),
      ...(ctx === undefined ? {} : { abortSignal: ctx.abortSignal }),
    });
}

/**
 * One call's IO over a sandbox session. The session resolves lazily on first
 * use and is shared across the call's operations.
 */
export function createSandboxIo(opts: {
  root: string;
  session: () => PromiseLike<SandboxSessionLike>;
  abortSignal?: AbortSignal;
}): WorkspaceIO {
  const { root } = opts;
  let resolved: Promise<SandboxSessionLike> | null = null;
  const session = (): Promise<SandboxSessionLike> => {
    resolved ??= Promise.resolve(opts.session());
    return resolved;
  };

  async function run(command: string): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }> {
    throwIfAborted(opts.abortSignal);
    const sb = await session();
    const result = await sb.run({ command, workingDirectory: root });
    throwIfAborted(opts.abortSignal);
    return result;
  }

  return {
    async stat(abs): Promise<IoStat | null> {
      // GNU coreutils format first (every Linux sandbox); the BSD fallback
      // only runs when -c itself failed (a macOS-hosted fake in tests). A
      // missing path fails both branches → null.
      const q = shellSingleQuote(abs);
      const result = await run(
        `stat -c '%s %Y %F' -- ${q} 2>/dev/null || stat -f '%z %m %HT' -- ${q}`,
      );
      if (result.exitCode !== 0) return null;
      const match = /^(\d+)\s+(\d+)\s+(.+)$/.exec(result.stdout.trim());
      if (match === null) return null;
      const [, size, mtimeSec, kind] = match;
      if (size === undefined || mtimeSec === undefined || kind === undefined) return null;
      return {
        isFile: /regular/i.test(kind),
        size: Number(size),
        mtimeMs: Number(mtimeSec) * 1000,
      };
    },

    async readFile(abs) {
      throwIfAborted(opts.abortSignal);
      const sb = await session();
      const bytes = await sb.readBinaryFile({ path: abs });
      throwIfAborted(opts.abortSignal);
      return bytes === null ? null : Buffer.from(bytes);
    },

    async writeFile(abs, content) {
      throwIfAborted(opts.abortSignal);
      const sb = await session();
      const bytes =
        typeof content === "string" ? new TextEncoder().encode(content) : content;
      // Parent directories are the backend's job (the AI SDK sandbox write
      // contract creates them recursively).
      await sb.writeBinaryFile({ path: abs, content: bytes });
      // The remote write may have committed before cancellation arrived; it
      // cannot be rolled back, but the cancelled turn must not publish a
      // successful tool result and continue from an uncertain mutation.
      throwIfAborted(opts.abortSignal);
    },

    async listFiles(scope) {
      const rel = scope === undefined ? undefined : relativizeWithin(root, scope);
      const spec = rel === undefined || rel === "." ? "" : ` -- ${shellSingleQuote(rel)}`;
      const listed = await run(
        `git ls-files --cached --others --exclude-standard -z${spec}`,
      );
      if (listed.exitCode === 0) {
        const files = listed.stdout.split("\0").filter((p) => p.length > 0);
        // `--cached` still lists a tracked file after an un-staged `rm`;
        // subtract those, tolerating a failed follow-up (see ./list-files.ts).
        const deleted = await run(`git ls-files --deleted -z${spec}`);
        if (deleted.exitCode !== 0) return files;
        const gone = new Set(deleted.stdout.split("\0").filter((p) => p.length > 0));
        return gone.size === 0 ? files : files.filter((p) => !gone.has(p));
      }
      // Not a git checkout (or git missing): a pruned find (VCS stores +
      // node_modules), then the root .gitignore applied client-side —
      // without git to interpret the full nested-ignore chain, the root
      // file covers the common build-output patterns the local walk skips.
      const start = rel === undefined || rel === "." ? "." : shellSingleQuote(rel);
      const prune = `\\( ${[...ALWAYS_IGNORED].map((dir) => `-name ${dir}`).join(" -o ")} \\) -prune`;
      const found = await run(`find ${start} ${prune} -o -type f -print`);
      if (found.exitCode !== 0) {
        throw new Error(
          `Could not list workspace files in the sandbox: ${found.stderr.trim() || `find exited ${found.exitCode}`}`,
        );
      }
      const files = found.stdout
        .split("\n")
        .map((line) => (line.startsWith("./") ? line.slice(2) : line))
        .filter((line) => line.length > 0);
      const sb = await session();
      const rootIgnore = await sb.readBinaryFile({ path: `${root}/.gitignore` });
      throwIfAborted(opts.abortSignal);
      if (rootIgnore === null) return files;
      const matcher = ignore().add(Buffer.from(rootIgnore).toString("utf8"));
      return files.filter((file) => !matcher.ignores(file));
    },

    async search(options) {
      const scopeRel =
        options.scope === undefined ? "." : relativizeWithin(root, options.scope);
      const viaRg = await runSearch(run, buildRipgrepCommand(options, scopeRel));
      if (viaRg.exitCode === 0 || viaRg.exitCode === 1) {
        return parseSearchOutput(viaRg.stdout, options.maxMatches, viaRg.flooded);
      }
      // 127 = rg not installed; anything else from rg is a real error.
      if (viaRg.exitCode !== 127) {
        throw new Error(
          `Search failed in the sandbox (rg exited ${viaRg.exitCode}): ${viaRg.stderr.trim()}`,
        );
      }
      const viaGrep = await runSearch(run, buildPosixGrepCommand(options, scopeRel));
      if (viaGrep.exitCode === 0 || viaGrep.exitCode === 1) {
        // The find|grep pipeline has neither gitignore awareness nor the
        // local backend's glob semantics, so both filters run client-side on
        // the parsed matches — the glob through the same globToRegExp the
        // local backend uses (path globs like `src/**/*.ts` included), the
        // ignore rules from the root .gitignore. Filter BEFORE the match
        // cap, so filtered lines never consume the budget (stdout is
        // already bounded by runSearch's byte cap).
        const parsed = parseSearchOutput(
          viaGrep.stdout,
          Number.MAX_SAFE_INTEGER,
          viaGrep.flooded,
        );
        const globRe = options.glob === undefined ? null : globToRegExp(options.glob);
        const sb = await session();
        const rootIgnore = await sb.readBinaryFile({ path: `${root}/.gitignore` });
        throwIfAborted(opts.abortSignal);
        const matcher =
          rootIgnore === null
            ? null
            : ignore().add(Buffer.from(rootIgnore).toString("utf8"));
        const kept = parsed.matches.filter(
          (m) =>
            (globRe === null || globRe.test(m.file)) &&
            (matcher === null || !matcher.ignores(m.file)),
        );
        return {
          matches: kept.slice(0, options.maxMatches),
          // Flood keeps precedence — a cut stream is the stronger claim.
          stopped:
            parsed.stopped === "output-cap"
              ? "output-cap"
              : kept.length >= options.maxMatches
                ? "max-matches"
                : parsed.stopped,
          skippedLargeFiles: null,
        };
      }
      throw new Error(
        `Search failed in the sandbox (grep exited ${viaGrep.exitCode}): ${viaGrep.stderr.trim()}`,
      );
    },
  };
}

/**
 * Total-output cap on a remote search. `--max-count` only bounds matches per
 * FILE, so many matching files could otherwise stream an unbounded stdout
 * over the sandbox transport before the parser truncates. 10 MiB holds far
 * more lines than any match cap needs while bounding the transfer.
 */
export const SEARCH_OUTPUT_CAP_BYTES = 10 * 1024 * 1024;

const SEARCH_EXIT_SENTINEL = "__ZO_SEARCH_EXIT__";

/**
 * Run a search command with its stdout piped through `head -c`. The pipe
 * makes the shell's exit code head's (useless), so the search's own exit
 * code rides stdout as a trailing sentinel line. A missing sentinel means
 * head cut the output — the search flooded the cap — which the caller
 * treats as a truncated-but-successful scan.
 */
async function runSearch(
  run: (command: string) => Promise<{ exitCode: number; stdout: string; stderr: string }>,
  command: string,
): Promise<{ exitCode: number; stdout: string; stderr: string; flooded: boolean }> {
  const wrapped = `{ ${command}; printf '\\n${SEARCH_EXIT_SENTINEL}:%d\\n' "$?"; } | head -c ${SEARCH_OUTPUT_CAP_BYTES}`;
  const result = await run(wrapped);
  const parsed = extractSearchExit(result.stdout);
  if (parsed.exitCode === null) {
    // No sentinel and the shell itself failed: a real execution error.
    if (result.exitCode !== 0) {
      return { exitCode: result.exitCode, stdout: parsed.stdout, stderr: result.stderr, flooded: false };
    }
    // No sentinel with a clean shell exit: head cut the stream mid-flood.
    return { exitCode: 0, stdout: parsed.stdout, stderr: result.stderr, flooded: true };
  }
  return {
    exitCode: parsed.exitCode,
    stdout: parsed.stdout,
    stderr: result.stderr,
    flooded: false,
  };
}

/**
 * Split a search's stdout from its trailing exit sentinel. Exported for
 * tests. `exitCode: null` = sentinel missing (output was cut by the cap, or
 * the shell never ran the wrapped block).
 */
export function extractSearchExit(stdout: string): {
  stdout: string;
  exitCode: number | null;
} {
  const match = new RegExp(`\\n?${SEARCH_EXIT_SENTINEL}:(\\d+)\\n?$`).exec(stdout);
  if (match === null || match[1] === undefined) {
    return { stdout, exitCode: null };
  }
  return { stdout: stdout.slice(0, match.index), exitCode: Number(match[1]) };
}

// `--max-count` bounds matches per file; the total bound is enforced when
// parsing (parseSearchOutput) plus the byte cap in runSearch, same split as
// eve's built-in sandbox grep. `--max-filesize` mirrors the local backend's
// oversized-file skip (MAX_SEARCH_FILE_BYTES) so the tool description's
// size claim holds on this backend too. The `!**/<dir>` globs mirror the
// local walk's unconditional skips (walk.ts ALWAYS_IGNORED) — rg honors
// .gitignore on its own, but a non-git tree (or an uncovered node_modules)
// must not diverge from the local backend by flooding into dependency dirs.
function buildRipgrepCommand(options: IoSearchOptions, scopeRel: string): string {
  const parts = [
    "rg",
    "--line-number",
    "--with-filename",
    "--no-heading",
    "--color=never",
    "--hidden",
    ...[...ALWAYS_IGNORED].map((dir) => `--glob ${shellSingleQuote(`!**/${dir}`)}`),
    `--max-filesize ${MAX_SEARCH_FILE_BYTES}`,
  ];
  if (options.ignoreCase) parts.push("--ignore-case");
  if (options.glob !== undefined) parts.push(`--glob ${shellSingleQuote(options.glob)}`);
  parts.push(`--max-count ${options.maxMatches}`);
  parts.push(`--regexp ${shellSingleQuote(options.pattern)}`);
  parts.push("--", shellSingleQuote(scopeRel));
  return parts.join(" ");
}

// The last-resort searcher (no rg on the sandbox): a pruned, size-filtered
// `find` driving `grep` via `-exec … +`, so the VCS/dependency dirs and the
// oversized-file skip hold here too (POSIX grep alone has neither). The
// caller applies the root .gitignore to the matches, and the byte cap in
// runSearch bounds the transfer. One trade: find folds grep's exit codes
// into its own nonzero status, so a rare grep-side pattern error reads as
// "no matches" instead of throwing — acceptable for the last-resort path
// (patterns are pre-validated as JS regexes by the tool).
function buildPosixGrepCommand(options: IoSearchOptions, scopeRel: string): string {
  const prune = `\\( ${[...ALWAYS_IGNORED].map((dir) => `-name ${dir}`).join(" -o ")} \\) -prune`;
  // No `-name` filter for the glob: find's basename matching can't express
  // path globs (`src/**/*.ts`), so the caller filters matches client-side
  // with the local backend's globToRegExp instead.
  const filters = ["-type f", `-size -${MAX_SEARCH_FILE_BYTES}c`];
  const grep = [
    "grep",
    "-n",
    "-H",
    "-E",
    "--color=never",
    ...(options.ignoreCase ? ["-i"] : []),
    `-m ${options.maxMatches}`,
    "-e",
    shellSingleQuote(options.pattern),
    "--",
  ].join(" ");
  return `find ${shellSingleQuote(scopeRel)} ${prune} -o ${filters.join(" ")} -exec ${grep} {} +`;
}

/**
 * Split one search line into `file:line:text` at the first `:<digits>:`
 * boundary, or null for a non-match line (context separator, binary notice).
 *
 * A linear scan, deliberately not a regex: the natural `/^(.+?):(\d+):(.*)$/`
 * is polynomial on a line that can't match (CodeQL js/polynomial-redos) —
 * JS `.` excludes `\r`, so a CRLF line's trailing `\r` fails the final `$`
 * and the lazy `.+?`/`\d+` backtrack quadratically (a crafted line near
 * runSearch's 10 MB cap ran for minutes). Trimming the `\r` first also fixes
 * the latent bug where every CRLF-file match silently parsed as null.
 */
function parseSearchLine(
  line: string,
): { file: string; lineNo: string; text: string } | null {
  const s = line.endsWith("\r") ? line.slice(0, -1) : line;
  let from = 0;
  for (;;) {
    const colon = s.indexOf(":", from);
    if (colon === -1) return null;
    // file (the pre-regex `.+?`) must be non-empty.
    if (colon === 0) {
      from = 1;
      continue;
    }
    let end = colon + 1;
    while (end < s.length && s.charCodeAt(end) >= 48 && s.charCodeAt(end) <= 57) end++;
    if (end > colon + 1 && s.charCodeAt(end) === 58 /* ":" */) {
      return { file: s.slice(0, colon), lineNo: s.slice(colon + 1, end), text: s.slice(end + 1) };
    }
    from = colon + 1;
  }
}

/**
 * Parse `file:line:text` search output into matches, enforcing the total
 * bound. Reaching the bound (or a `flooded` byte-capped stream) marks the
 * scan stopped — more matches may exist past the cap, exactly like the
 * local backend stopping its scan.
 */
export function parseSearchOutput(
  stdout: string,
  maxMatches: number,
  flooded = false,
): IoSearchResult {
  const matches: IoSearchMatch[] = [];
  let stopped: IoSearchResult["stopped"] = flooded ? "output-cap" : false;
  for (const line of stdout.split("\n")) {
    if (line.length === 0) continue;
    const parsed = parseSearchLine(line);
    if (parsed === null) continue; // context separators, binary-file notices
    const { file, lineNo, text } = parsed;
    matches.push({
      file: file.startsWith("./") ? file.slice(2) : file,
      line: Number(lineNo),
      text,
    });
    if (matches.length >= maxMatches) {
      // A flood is the stronger claim: the stream was cut, so "stopped at
      // the match cap" would overstate how much of the corpus was covered.
      if (stopped === false) stopped = "max-matches";
      break;
    }
  }
  // Remote searchers enforce the size cap (rg --max-filesize) but don't
  // report a skip count; null = unknown, never a misleading 0.
  return { matches, stopped, skippedLargeFiles: null };
}
