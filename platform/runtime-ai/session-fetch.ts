// Stamps the ambient eve BILLING session id onto each proxied gateway call, so apps/api
// can join the metered usage back to the session's owner (`eveSessionId` →
// `Conversation`/`BuilderConversation`; see plans/ray/usage-event-persistence.md).
//
// "Billing session" = the ROOT of the dispatch chain. A subagent child session is
// runtime-internal — it has no conversation row and never will — so its calls stamp the
// ambient parent's `rootSessionId` and the join lands on the root session's conversation
// at write time (plans/ben/subagent-shared-sandboxes.md, PR 2). The child's OWN id still
// rides along as untrusted descriptive detail on `x-zo-eve-subagent-session`, landing in
// `UsageEvent.metadata.subagentSessionId` so per-child spend stays queryable.
//
// Why a fetch wrapper: `createGateway`'s `headers` is a static record resolved once at
// construction, but the session id changes per call — the custom `fetch` option is the
// per-request seam. The fetch runs inside eve's AsyncLocalStorage scope during a model
// call ("model callbacks observe the unified context" — eve's own contract), so the
// ambient read is race-free under concurrent sessions, unlike capturing the id into
// module state from a hook.
//
// Why no `eve` import: this package is vendored source-only into the agent working
// copy, where `ai` + Node built-ins are the only guaranteed deps. eve 0.16 doesn't
// export `getContext`/`SessionIdKey` publicly anyway — but it deliberately publishes
// its context storage process-wide (`Symbol.for("eve.context-storage")`, "used by
// every eve module copy") exactly so out-of-tree code can share it. We read that slot
// with runtime checks; `session-fetch.test.ts` locks the contract against the
// installed eve so an upgrade that moves it fails loudly in `test:packages`.

/**
 * Mirrors `@zocomputer/runtime-auth`'s `EVE_SESSION_HEADER` — a deliberate duplicate
 * for the same reason `ZO_TOOL_HEADER` is (see `gateway.ts`): this package can't
 * import workspace siblings. apps/api reads it into the gateway attribution and strips
 * it before forwarding upstream.
 *
 * Carries the session this call BILLS TO — for a subagent child, the root of the
 * dispatch chain (the only session with a conversation row), not the child's own id.
 */
export const EVE_SESSION_HEADER = "x-zo-eve-session";

/**
 * Mirrors `@zocomputer/runtime-auth`'s `EVE_TURN_HEADER` (same duplication rule).
 * Descriptive metering detail — it lands in `UsageEvent.metadata.turnId` and pins a
 * Zo-paid tool's own gateway call (invisible to eve's step machinery) to its turn.
 */
export const EVE_TURN_HEADER = "x-zo-eve-turn";

/**
 * Mirrors `@zocomputer/runtime-auth`'s `EVE_SUBAGENT_SESSION_HEADER` (same duplication
 * rule). The CHILD's own session id when the ambient session is a subagent — untrusted
 * descriptive detail (never joined), landing in `UsageEvent.metadata.subagentSessionId`
 * so per-child spend stays queryable while the row's `eveSessionId` carries the root.
 */
export const EVE_SUBAGENT_SESSION_HEADER = "x-zo-eve-subagent-session";

/** The process-wide slot eve publishes its context `AsyncLocalStorage` under. */
const EVE_CONTEXT_STORAGE_KEY = Symbol.for("eve.context-storage");

/** `SessionIdKey.name` in eve — a durable serialized key, so it can't drift casually. */
const SESSION_ID_KEY_NAME = "eve.sessionId";

/** `SessionKey.name` in eve — the durable session object carrying `turn.id`. */
const SESSION_KEY_NAME = "eve.session";

/** `ParentSessionKey.name` in eve — the `SessionParent` lineage seeded for subagents. */
const PARENT_SESSION_KEY_NAME = "eve.parentSession";

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

/**
 * The eve session id of the call currently in scope, or `undefined` when there isn't
 * one. Never throws: a fetch outside any session (e.g. the gateway provider's
 * background model-metadata refresh) or a runtime without eve simply reads no slot.
 */
export function ambientEveSessionId(): string | undefined {
  const value = ambientContextValue(SESSION_ID_KEY_NAME);
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

/**
 * The lineage of a subagent child session, as this module consumes it — a structural
 * subset of eve's `SessionParent` (`{ callId, rootSessionId, sessionId, turn }`):
 * `rootSessionId` names the TOP of the dispatch chain at any depth (eve denormalizes
 * it, so a grandchild still carries the top session's id), `sessionId` the immediate
 * parent. Absent for a root session.
 */
export interface AmbientSessionParent {
  readonly rootSessionId: string;
  readonly sessionId: string;
}

/**
 * The subagent lineage of the session currently in scope, or `null` when there is
 * none — a root session, no ALS scope, or a malformed slot value. Read from eve's
 * `ParentSessionKey` with the same structural guards as the other ambient reads:
 * never throws, never trusts shape (any malformed field → `null`, so billing falls
 * back to the session's own id rather than stamping garbage).
 */
export function ambientSessionParent(): AmbientSessionParent | null {
  const parent = ambientContextValue(PARENT_SESSION_KEY_NAME);
  if (typeof parent !== "object" || parent === null) return null;
  const rootSessionId = (parent as Record<string, unknown>)["rootSessionId"];
  const sessionId = (parent as Record<string, unknown>)["sessionId"];
  if (typeof rootSessionId !== "string" || rootSessionId.trim().length === 0) return null;
  if (typeof sessionId !== "string" || sessionId.trim().length === 0) return null;
  return { rootSessionId, sessionId };
}

/**
 * The eve turn id of the call currently in scope, or `undefined`. Read from the
 * durable session object (`SessionKey` → `{ sessionId, turn: { id } }`) with the
 * same runtime checks as the session read — never throws, never trusts shape.
 */
export function ambientEveTurnId(): string | undefined {
  const session = ambientContextValue(SESSION_KEY_NAME);
  if (typeof session !== "object" || session === null) return undefined;
  const turn = (session as Record<string, unknown>)["turn"];
  if (typeof turn !== "object" || turn === null) return undefined;
  const id = (turn as Record<string, unknown>)["id"];
  return typeof id === "string" && id.trim().length > 0 ? id : undefined;
}

/** One guarded read of eve's process-wide context slot by key name. */
function ambientContextValue(keyName: string): unknown {
  const storage: unknown = Reflect.get(globalThis, EVE_CONTEXT_STORAGE_KEY);
  if (!hasMethod(storage, "getStore")) return undefined;
  const store = storage.getStore();
  // The store is eve's context container; `get` reads a key by its `.name`.
  if (!hasMethod(store, "get")) return undefined;
  return store.get({ name: keyName });
}

/**
 * Wrap a fetch so every request carries the current eve BILLING session id, when there
 * is one. No session in scope (or a blank id) → the request passes through untouched.
 *
 * Root-first resolution: a subagent child (ambient parent present) stamps its parent's
 * `rootSessionId` as `EVE_SESSION_HEADER` — the session the call bills to, and the only
 * one the control plane has a conversation row for — plus its OWN id on
 * `EVE_SUBAGENT_SESSION_HEADER` as descriptive detail. A root session stamps its own id
 * and no subagent header.
 *
 * `Object.assign` onto the wrapper keeps the base fetch's extra surface (Bun types a
 * `preconnect` on `fetch`), so the result satisfies `typeof globalThis.fetch`.
 */
type FetchInput = Parameters<typeof globalThis.fetch>[0];
type FetchInit = Parameters<typeof globalThis.fetch>[1];

export function eveSessionFetch(
  getSessionId: () => string | undefined = ambientEveSessionId,
  baseFetch: typeof globalThis.fetch = globalThis.fetch,
  getTurnId: () => string | undefined = ambientEveTurnId,
  getSessionParent: () => AmbientSessionParent | null = ambientSessionParent,
): typeof globalThis.fetch {
  return Object.assign((input: FetchInput, init?: FetchInit) => {
    const sessionId = getSessionId()?.trim();
    if (!sessionId) return baseFetch(input, init);
    // Merge order matches fetch semantics: `init.headers` (when present) replaces a
    // Request input's headers wholesale, so start from whichever would win.
    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    );
    // The billing session: the ambient parent's root wins (a subagent child's own id
    // has no conversation row to join), else the session's own id. A malformed parent
    // reads as absent (ambientSessionParent's guards), so billing falls back safely.
    const parent = getSessionParent();
    headers.set(EVE_SESSION_HEADER, parent?.rootSessionId ?? sessionId);
    // The turn only rides with a session — a turn id with no session id would be
    // unjoinable noise, so the whole stamp is gated on the session being present.
    // Like the session header, the ambient value is AUTHORITATIVE either way: a
    // stale pre-existing turn header is overwritten when a turn is in scope and
    // removed when one isn't, so it can never mislabel a row's metadata.turnId.
    const turnId = getTurnId()?.trim();
    if (turnId) headers.set(EVE_TURN_HEADER, turnId);
    else headers.delete(EVE_TURN_HEADER);
    // Same gating discipline for the child's own id: it only rides with a session,
    // and the ambient lineage is authoritative — a stale pre-existing value is
    // overwritten when a parent is ambient and removed when there is none, so a root
    // session's rows can never carry a phantom metadata.subagentSessionId.
    if (parent) headers.set(EVE_SUBAGENT_SESSION_HEADER, sessionId);
    else headers.delete(EVE_SUBAGENT_SESSION_HEADER);
    return baseFetch(input, { ...init, headers });
  }, baseFetch);
}
