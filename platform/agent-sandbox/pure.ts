import { Buffer } from "node:buffer";
import path from "node:path";

// Pure, dependency-free helpers shared by the backend and session layers.
// Kept here (no SSH/eve runtime objects) so they're unit-testable in isolation —
// see `pure.test.ts`.

/**
 * Eve's nominal sandbox root. Eve's runtime hardcodes this absolute path —
 * skill materialization writes `/workspace/skills/<name>/…` and its framework
 * `load_skill` tool reads `/workspace/skills/<name>/SKILL.md` back — but on the
 * Daytona image `/workspace` doesn't exist and the `daytona` user can't create
 * it (root-owned mount point), so those paths must be remapped onto the real
 * work dir. See `mapNominalWorkspacePath`.
 */
export const NOMINAL_WORKSPACE_ROOT = "/workspace";

/** Is `resolved` the work dir itself or a path beneath it? */
function withinWorkDir(workDir: string, resolved: string): boolean {
  const prefix = workDir.endsWith("/") ? workDir : `${workDir}/`;
  return resolved === workDir || resolved.startsWith(prefix);
}

/**
 * Transparently remap eve's nominal `/workspace` root onto the session's real
 * work dir: `/workspace` → `workDir`, `/workspace/<rest>` → `<workDir>/<rest>`.
 * Any other path passes through unchanged — the prefix must be a whole segment
 * at the path root, so `/workspaces/x` and `/home/daytona/workspace-file` are
 * NOT remapped.
 *
 * A `..` in the rest that would land the mapped path OUTSIDE the work dir
 * (e.g. `/workspace/../x` → `/home/x`) throws — a nominal path has no
 * legitimate reason to climb out of the root it names, so an escape is a bug
 * (or an attempt), the same policy relative paths get in `resolveSandboxPath`.
 * `..` that stays inside (`/workspace/a/../b`) is fine.
 *
 * Why `<workDir>/<rest>` and not `<workDir>/workspace/<rest>`: relative paths
 * already anchor to the work dir, the seed agents root their file tools at
 * `/home/daytona` directly (see apps/api/seed/lib/file-tools.ts), and the
 * Builder checkout lives at `/home/daytona/agent` — so eve-materialized skills
 * at `/workspace/skills/x` stay visible to all of them at the `skills/x`
 * relative path. A `/home/daytona/workspace/…` mirror would hide them in a
 * subdirectory nothing else reads.
 */
export function mapNominalWorkspacePath(workDir: string, p: string): string {
  if (p === NOMINAL_WORKSPACE_ROOT) return workDir;
  const prefix = `${NOMINAL_WORKSPACE_ROOT}/`;
  if (!p.startsWith(prefix)) return p;
  const rest = p.slice(prefix.length);
  // `/workspace/` (empty rest) is the root itself; join normalizes duplicate
  // slashes in a non-empty rest (e.g. `/workspace//skills`).
  const mapped = rest === "" ? workDir : path.posix.join(workDir, rest);
  if (!withinWorkDir(workDir, mapped)) {
    throw new Error(`sandbox path escapes the work dir: ${p}`);
  }
  return mapped;
}

/**
 * Anchor a sandbox path to the work dir: relative paths resolve under
 * `workDir`; absolute paths pass through unchanged, except eve's nominal
 * `/workspace` root, which is remapped onto `workDir` (see
 * `mapNominalWorkspacePath`).
 *
 * A relative path that escapes `workDir` via `..` (e.g. `../../etc/passwd`) is
 * rejected — `path.posix.join` would otherwise normalize it to a location
 * outside the workspace, which the file methods would then read/write. (Mapped
 * `/workspace` paths get the same guard inside `mapNominalWorkspacePath`.)
 */
export function resolveSandboxPath(workDir: string, p: string): string {
  if (path.posix.isAbsolute(p)) return mapNominalWorkspacePath(workDir, p);
  const resolved = path.posix.join(workDir, p);
  if (!withinWorkDir(workDir, resolved)) {
    throw new Error(`sandbox path escapes the work dir: ${p}`);
  }
  return resolved;
}

/**
 * POSIX single-quote a string for safe interpolation into a shell command —
 * wraps in `'…'` and escapes embedded single quotes as `'\''`. Used to quote a
 * path (e.g. a `cd` target) so shell metacharacters in it are treated literally,
 * not interpreted. (The model-supplied command itself is intentionally shell.)
 */
export function shellSingleQuote(s: string): string {
  return `'${s.replaceAll("'", "'\\''")}'`;
}

/**
 * The reconnect metadata we persist on the eve session. `daytonaSandboxId` is
 * the provider sandbox id; eve hands it back as `existingMetadata` on a reply so
 * the control plane reattaches the same sandbox.
 */
export interface DaytonaSessionMetadata {
  readonly daytonaSandboxId: string;
  /**
   * Diagnostic only: the lineage-derived root session id the broker was keyed
   * on, present only when a subagent child shared its root session's sandbox
   * (see zo-backend.ts). Never read back on reconnect — the broker re-resolves
   * lineage each time; this exists so a persisted handle records WHICH key
   * provisioned it.
   */
  readonly brokeredSessionKey?: string;
}

/** Narrow persisted metadata to a non-empty `daytonaSandboxId`, else `null`. */
export function readSandboxId(
  metadata: Record<string, unknown> | undefined,
): string | null {
  const id = metadata?.daytonaSandboxId;
  return typeof id === "string" && id !== "" ? id : null;
}

/**
 * Resolve a caller-supplied encoding to a Node `BufferEncoding`, or throw a
 * clear error. `undefined`/`utf-8`/`utf8` → `"utf8"` (eve's default); anything
 * else is validated with `Buffer.isEncoding` (a type guard, so no cast) and
 * rejected if unknown — rather than letting an arbitrary string reach
 * `Buffer.from(…, badEncoding)` as an unchecked cast / opaque TypeError.
 */
export function resolveEncoding(encoding?: string): BufferEncoding {
  if (encoding === undefined || /^utf-?8$/i.test(encoding)) return "utf8";
  if (Buffer.isEncoding(encoding)) return encoding;
  throw new Error(`zo sandbox: unsupported text encoding ${JSON.stringify(encoding)}`);
}

/** Decode bytes as text. utf-8 uses fatal mode (invalid bytes throw, not replace). */
export function decodeText(bytes: Uint8Array, encoding?: string): string {
  const enc = resolveEncoding(encoding);
  if (enc === "utf8") return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  return Buffer.from(bytes).toString(enc);
}

/** Encode text to bytes for the given encoding (utf-8 default). */
export function encodeText(text: string, encoding?: string): Uint8Array {
  const enc = resolveEncoding(encoding);
  if (enc === "utf8") return new TextEncoder().encode(text);
  return new Uint8Array(Buffer.from(text, enc));
}

// Line-range slicing is NOT implemented here — readTextFile uses the AI-SDK's
// extractLines (the exact impl eve uses), so we don't own that edge-case-laden
// logic. See ssh-session.ts.
