import { Buffer } from "node:buffer";
import path from "node:path";

// Pure, dependency-free helpers shared by the backend and session layers.
// Kept here (no SSH/eve runtime objects) so they're unit-testable in isolation —
// see `pure.test.ts`.

/**
 * Anchor a sandbox path to the work dir: relative paths resolve under
 * `workDir`, absolute paths pass through unchanged.
 *
 * A relative path that escapes `workDir` via `..` (e.g. `../../etc/passwd`) is
 * rejected — `path.posix.join` would otherwise normalize it to a location
 * outside the workspace, which the file methods would then read/write.
 */
export function resolveSandboxPath(workDir: string, p: string): string {
  if (path.posix.isAbsolute(p)) return p;
  const resolved = path.posix.join(workDir, p);
  // Stay within workDir: either the dir itself or a path beneath it.
  const prefix = workDir.endsWith("/") ? workDir : `${workDir}/`;
  if (resolved !== workDir && !resolved.startsWith(prefix)) {
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
