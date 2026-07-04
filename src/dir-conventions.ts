import { readFileSync } from "node:fs";
import { join } from "node:path";

// Directory-conventions riders for the `read` tool: the first time a session
// reads a file under a directory that carries its own conventions file
// (AGENTS.md by default), the read result carries that file's content along —
// once per directory per session. This makes convention delivery structural
// instead of hoping the model remembers to read nested AGENTS.md files
// (Cursor's harness does exactly this; see
// journal/ben/rib/2026-07-02-learning-from-cursor.md).
//
// The root conventions file is deliberately excluded: agents inject it as a
// system-prompt section (createRepoConventionsInstruction), and re-delivering
// the largest file in the chain on the first read would double-pay for it.
//
// Riders are tool-RESULT content, appended to the transcript — they never
// touch tool descriptions or instructions, so this is prompt-cache-safe by
// construction.

/** One conventions rider attached to a read result. */
export type DirConventionsRider =
  | { readonly path: string; readonly content: string }
  | { readonly path: string; readonly note: string };

export interface DirConventionsOptions {
  /** Workspace root; the chain walks from here (exclusive) down to the file. */
  workspaceRoot: string;
  /** Conventions filename to look for in each directory. Default "AGENTS.md". */
  fileName?: string;
  /**
   * Per-file content cap in bytes; an oversized conventions file becomes a
   * pointer note instead of inline content. Default 16 KB.
   */
  maxBytesPerFile?: number;
  /**
   * Max conventions files inlined per read; on a first read deep in a tree,
   * the directories nearest the file get content and the rest get pointer
   * notes. Default 4.
   */
  maxFilesPerRead?: number;
  /**
   * File loader, injectable for tests. Returns the file's content or null
   * when it doesn't exist (sync or async — a sandbox-backed read is async).
   * Defaults to a UTF-8 fs read. Callers with a per-call I/O backend (the
   * read tool resolving a sandbox session) pass a loader to `collect`
   * instead, which overrides this one.
   */
  loadFile?: (absPath: string) => string | null | Promise<string | null>;
  /**
   * Max sessions tracked per workspace; least-recently-used sessions evict
   * first (an evicted session that reappears re-delivers). Default 100.
   */
  maxSessions?: number;
}

export interface DirConventionsTracker {
  /**
   * Riders for a read of `relPath` (workspace-relative), marking every
   * directory on its chain as delivered for `sessionId`. No session id (a
   * caller outside an eve session) → no riders, no tracking. `loadFile`
   * overrides the tracker's own loader for this call — the read tool passes
   * its per-call workspace IO here so riders come off the same backend
   * (local disk or sandbox) as the read itself.
   */
  collect(
    sessionId: string | undefined,
    relPath: string,
    loadFile?: (absPath: string) => string | null | Promise<string | null>,
  ): Promise<DirConventionsRider[]>;
}

const DEFAULT_MAX_BYTES_PER_FILE = 16 * 1024;
const DEFAULT_MAX_FILES_PER_READ = 4;
// Bound per-tracker memory over a long-lived process; least-recently-used
// sessions drop first (worst case: an evicted session re-delivers).
const DEFAULT_MAX_SESSIONS = 100;

/**
 * Normalize a workspace-relative path to forward slashes. Riders and chain
 * entries always use `/` regardless of platform, so equality checks and
 * reported paths can't diverge between a `/`-style relPath and a
 * `\`-style `path.join` product on Windows.
 */
function normalizeRel(relPath: string): string {
  return relPath
    .split(/[\\/]+/)
    .filter((s) => s.length > 0)
    .join("/");
}

/**
 * The directory chain a read of `relPath` passes through, shallow → deep,
 * excluding the workspace root itself. Accepts `/` or `\` separators and
 * returns `/`-joined entries. Pure; exported for tests.
 */
export function dirChain(relPath: string): string[] {
  const segments = normalizeRel(relPath).split("/").filter((s) => s.length > 0);
  const dirs: string[] = [];
  // The last segment is the file itself.
  for (let i = 0; i < segments.length - 1; i++) {
    dirs.push(segments.slice(0, i + 1).join("/"));
  }
  return dirs;
}

function defaultLoadFile(absPath: string): string | null {
  try {
    return readFileSync(absPath, "utf8");
  } catch {
    return null;
  }
}

// Trackers are deduped per workspaceRoot+fileName on globalThis: eve's dev
// runtime rebuilds authored artifacts mid-session and a rebuilt module graph
// would otherwise hold a fresh (empty) delivered-set and re-deliver every
// conventions file. Same hazard and same fix as the task registry
// (see ./async-tasks.ts); Symbol.for is shared across module copies.
const TRACKER_CACHE_KEY = Symbol.for("zocomputer.agent-sdk.dir-conventions");

interface TrackerState {
  /** sessionId → directories already considered (delivered or absent). */
  sessions: Map<string, Set<string>>;
}

function trackerStateCache(): Map<string, TrackerState> {
  const holder = globalThis as { [TRACKER_CACHE_KEY]?: Map<string, TrackerState> };
  holder[TRACKER_CACHE_KEY] ??= new Map();
  return holder[TRACKER_CACHE_KEY];
}

/** Test-only: drop the per-process tracker state dedupe. */
export function __resetDirConventionsCacheForTests(): void {
  trackerStateCache().clear();
}

export function createDirConventionsTracker(
  options: DirConventionsOptions,
): DirConventionsTracker {
  const {
    workspaceRoot,
    fileName = "AGENTS.md",
    maxBytesPerFile = DEFAULT_MAX_BYTES_PER_FILE,
    maxFilesPerRead = DEFAULT_MAX_FILES_PER_READ,
    loadFile = defaultLoadFile,
    maxSessions = DEFAULT_MAX_SESSIONS,
  } = options;

  // State (not the tracker) is what dedupes: two tracker instances over the
  // same root/fileName share one delivered-set even across module copies.
  const cache = trackerStateCache();
  const cacheKey = `${workspaceRoot}\u0000${fileName}`;
  let state = cache.get(cacheKey);
  if (!state) {
    state = { sessions: new Map() };
    cache.set(cacheKey, state);
  }
  const sessions = state.sessions;

  function deliveredSet(sessionId: string): Set<string> {
    const existing = sessions.get(sessionId);
    // LRU: re-insert on every access so an active session is never the
    // eviction victim — only sessions idle past 100 newer ones drop.
    if (existing) {
      sessions.delete(sessionId);
      sessions.set(sessionId, existing);
      return existing;
    }
    const set = new Set<string>();
    sessions.set(sessionId, set);
    // Maps iterate in insertion order, so the first key is least recently used.
    while (sessions.size > maxSessions) {
      const oldest = sessions.keys().next().value;
      if (oldest === undefined) break;
      sessions.delete(oldest);
    }
    return set;
  }

  return {
    async collect(sessionId, relPath, loadOverride) {
      if (!sessionId) return [];
      const load = loadOverride ?? loadFile;
      const delivered = deliveredSet(sessionId);
      const normalizedRel = normalizeRel(relPath);

      // Directories with an undelivered conventions file, shallow → deep.
      // Rider paths stay `/`-joined on every platform; only the filesystem
      // read converts to a native path (join handles `/` everywhere).
      const found: { dir: string; path: string; content: string }[] = [];
      for (const dir of dirChain(normalizedRel)) {
        if (delivered.has(dir)) continue;
        const riderRel = `${dir}/${fileName}`;
        // Reading the conventions file itself delivers it — no rider needed.
        if (riderRel === normalizedRel) {
          delivered.add(dir);
          continue;
        }
        // Reserve the slot BEFORE the async load: a turn's tool calls run
        // concurrently, and two reads first entering the same directory must
        // not both deliver its conventions.
        delivered.add(dir);
        let loaded: string | null;
        try {
          loaded = await load(join(workspaceRoot, riderRel));
        } catch {
          // A throwing loader is a transient failure (a sandbox hop, a
          // permissions blip), not a missing file: release the slot so a
          // later read under this directory retries the delivery. (A
          // concurrent read that skipped meanwhile also retries later —
          // at-most-once holds either way.)
          delivered.delete(dir);
          continue;
        }
        // Absent/empty after a successful load is a settled answer (nothing
        // to deliver): the reservation stands and the dir never re-probes.
        const content = loaded?.trim() ?? "";
        if (content.length === 0) continue;
        found.push({ dir, path: riderRel, content });
      }
      if (found.length === 0) return [];

      // The directories nearest the file get inline content; shallower
      // overflow (rare: >maxFilesPerRead conventions files on one chain)
      // becomes pointer notes so the result stays bounded.
      const inlineFrom = Math.max(0, found.length - maxFilesPerRead);
      return found.map(({ path, content }, index) => {
        if (index < inlineFrom || Buffer.byteLength(content, "utf8") > maxBytesPerFile) {
          return {
            path,
            note: `This directory has its own conventions — read ${path} before working here.`,
          };
        }
        return { path, content };
      });
    },
  };
}
