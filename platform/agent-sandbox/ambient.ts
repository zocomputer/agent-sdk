// Reads the subagent lineage eve seeds into its process-wide context storage,
// with NO eve runtime import. eve deliberately publishes its context
// AsyncLocalStorage on `Symbol.for("eve.context-storage")` ("used by every eve
// module copy") exactly so out-of-tree code can share it; the store it holds is
// eve's context container, read by key name (`ContextKey.name` is a durable
// serialized string). The lineage key is `ParentSessionKey` (name
// `"eve.parentSession"`), whose value is eve's `SessionParent` —
// `{ callId, rootSessionId, sessionId, turn }` — seeded only for subagent child
// sessions; a root session has no entry.
//
// This is a deliberate mirrored twin of `packages/runtime-ai/src/session-fetch.ts`'s
// ambient read: agent-sandbox cannot import runtime-ai (both packages are vendored
// self-contained into the fat agent-sdk / the agent working copy), so each carries
// its own copy of the handshake with its own eve-dist pin test. `ambient.test.ts`
// locks this one against the installed eve, so an upgrade that renames the key or
// moves the storage fails `bun test` loudly. See
// plans/ben/subagent-shared-sandboxes.md.

/** The process-wide slot eve publishes its context `AsyncLocalStorage` under. */
const EVE_CONTEXT_STORAGE_KEY = Symbol.for("eve.context-storage");

/** `ParentSessionKey.name` in eve — a durable serialized key, so it can't drift casually. */
const PARENT_SESSION_KEY_NAME = "eve.parentSession";

/**
 * The lineage slice of eve's `SessionParent` this package consumes. `turn` is
 * deliberately omitted — the sandbox keying decision needs only the ids.
 */
export interface AmbientSessionParent {
  /** Parent runtime-action tool call id that created this child session. */
  readonly callId: string;
  /** The TOP session of the dispatch chain — stable at any subagent depth. */
  readonly rootSessionId: string;
  /** The immediate parent session's id. */
  readonly sessionId: string;
}

/** Narrow structural check: a non-null object carrying a function under `name`. */
function hasMethod<K extends string>(
  value: unknown,
  name: K,
): value is Record<K, (...args: unknown[]) => unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>)[name] === "function"
  );
}

/** A non-blank string, else `null` — a blank id could never key the broker. */
function nonBlankString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

/** Parse-then-narrow the ambient value to the lineage slice, or `null` on any mismatch. */
function parseSessionParent(value: unknown): AmbientSessionParent | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  const callId = nonBlankString(v.callId);
  const rootSessionId = nonBlankString(v.rootSessionId);
  const sessionId = nonBlankString(v.sessionId);
  if (callId === null || rootSessionId === null || sessionId === null) return null;
  return { callId, rootSessionId, sessionId };
}

/**
 * The subagent lineage of the session currently in ALS scope, or `null` when
 * there isn't one: a root (non-child) session, a read outside eve's ALS scope,
 * a runtime without eve, or a malformed value all resolve to `null` — this
 * never throws, so callers can treat "no lineage" as one uniform case.
 */
export function ambientSessionParent(): AmbientSessionParent | null {
  try {
    const storage: unknown = Reflect.get(globalThis, EVE_CONTEXT_STORAGE_KEY);
    if (!hasMethod(storage, "getStore")) return null;
    const store = storage.getStore();
    // The store is eve's context container; `get` reads a key by its `.name`.
    if (!hasMethod(store, "get")) return null;
    return parseSessionParent(store.get({ name: PARENT_SESSION_KEY_NAME }));
  } catch {
    // Contract: never throw — a hostile/broken slot reads as "no lineage".
    return null;
  }
}
