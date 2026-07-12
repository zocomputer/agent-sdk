// Generic park-delivery: queue items for a session and release them as one
// batch exactly when the session is parked (`session.waiting`) and reachable
// (a continuation token has been seen). Background-task notifications and
// leftover steering messages ride this core; the effectful hook (./hooks.ts)
// performs the sends.
//
// eve hooks are observe-only for model context, so "delivery" means starting
// the session's NEXT turn, exactly like a user hitting send. Two paths emit a
// request:
// - `observe` — a `session.waiting` event arrives with items pending.
// - `enqueue` — an item arrives while the session is ALREADY parked (a
//   background task matching its watcher mid-park; no further stream events
//   will fire until something starts a turn, so the enqueue itself must
//   trigger the send).

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Recover the client-facing continuation token from a hook's runtime one.
 * eve namespaces the runtime token as `<namespace>:<client token>` (its
 * `namespaceContinuationToken` treats everything before the FIRST colon as the
 * namespace; the default HTTP channel's client token is itself `eve:<uuid>`,
 * so the runtime form is `eve:eve:<uuid>`). The continue route wants the
 * client token — sending the namespaced form silently creates a NEW session.
 */
export function clientContinuationToken(runtimeToken: string): string {
  const sep = runtimeToken.indexOf(":");
  if (sep <= 0) return runtimeToken;
  const rest = runtimeToken.slice(sep + 1);
  // A client token itself carries a scheme prefix (`eve:<uuid>`, id
  // colon-free), so strip exactly when the remainder is one `<scheme>:<id>`.
  // No colon there means the input was already client-facing; two or more
  // means the input isn't the `<ns>:<scheme>:<id>` grammar at all — pass both
  // through unchanged. Exactly-one (not "any colon") is what makes stripping
  // idempotent: a stripped result never matches the grammar again, so a
  // degenerate many-colon string can't lose a second layer on a re-strip.
  const schemeSep = rest.indexOf(":");
  if (schemeSep < 0) return runtimeToken;
  return rest.includes(":", schemeSep + 1) ? runtimeToken : rest;
}

/**
 * One item queued for park delivery: a dedupe key plus its payload. An item
 * with a key already delivered (or currently pending) is dropped.
 */
export interface ParkDeliveryItem<T> {
  /** Dedupe key: an item delivers at most once per session per process. */
  readonly key: string;
  readonly payload: T;
}

/**
 * A park-delivery flush: the session id, its client-facing continuation token,
 * and the batch of items ready to deliver. The caller performs the send and
 * reports back with `settle`.
 */
export interface ParkDeliveryRequest<T> {
  readonly sessionId: string;
  readonly continuationToken: string;
  readonly items: readonly ParkDeliveryItem<T>[];
}

/**
 * Per-process delivery state across sessions. Feed it every stream event via
 * `observe`; queue items with `enqueue` or `enqueueAll`. Either returns a
 * request exactly when a parked, reachable session has items to deliver. The
 * caller performs the send and reports back with `settle` — on failure the
 * items re-queue. Dedup is by item key for the session's lifetime in this
 * process, so an item never delivers twice even if a failed send races a user
 * message.
 */
export function createParkDeliveryState<T>() {
  interface SessionState {
    pending: Map<string, ParkDeliveryItem<T>>;
    delivered: Set<string>;
    continuationToken?: string;
    parked: boolean;
    delivering: boolean;
  }
  const sessions = new Map<string, SessionState>();

  function session(id: string): SessionState {
    let state = sessions.get(id);
    if (!state) {
      state = { pending: new Map(), delivered: new Set(), parked: false, delivering: false };
      sessions.set(id, state);
    }
    return state;
  }

  function drain(id: string, state: SessionState): ParkDeliveryRequest<T> | null {
    if (state.pending.size === 0 || !state.continuationToken || state.delivering) return null;
    // Move pending → delivered optimistically; `settle(ok: false)` re-queues.
    const items = [...state.pending.values()];
    state.pending.clear();
    for (const item of items) state.delivered.add(item.key);
    state.delivering = true;
    return { sessionId: id, continuationToken: state.continuationToken, items };
  }

  /**
   * Queue several items at once — all of them enter pending before any drain,
   * so a batch enqueued into an already-parked session goes out as one
   * delivery. Enqueuing the same batch item-by-item would let the first
   * item's immediate flush strand the rest into a second turn.
   */
  function enqueueAll(
    sessionId: string,
    items: readonly ParkDeliveryItem<T>[],
  ): ParkDeliveryRequest<T> | null {
    const state = session(sessionId);
    let queued = false;
    for (const item of items) {
      if (state.delivered.has(item.key) || state.pending.has(item.key)) continue;
      state.pending.set(item.key, item);
      queued = true;
    }
    if (!queued || !state.parked) return null;
    return drain(sessionId, state);
  }

  return {
    /**
     * Consume one stream event. `continuationToken` is the hook's runtime
     * (namespaced) token when known — latest wins; it's translated to the
     * client-facing token the continue route accepts.
     */
    observe(
      event: unknown,
      meta: { readonly sessionId: string; readonly continuationToken?: string | undefined },
    ): ParkDeliveryRequest<T> | null {
      const state = session(meta.sessionId);
      if (meta.continuationToken) {
        state.continuationToken = clientContinuationToken(meta.continuationToken);
      }
      if (!isRecord(event)) return null;
      if (event.type === "session.completed" || event.type === "session.failed") {
        sessions.delete(meta.sessionId);
        return null;
      }
      // Any non-waiting event means the session is active again; only a
      // `session.waiting` (the park) makes it deliverable.
      if (event.type !== "session.waiting") {
        state.parked = false;
        return null;
      }
      state.parked = true;
      return drain(meta.sessionId, state);
    },

    /**
     * Queue an item for a session. Returns a request immediately when the
     * session is currently parked and reachable — the caller must perform
     * that send (no later stream event will fire to flush it). An item whose
     * key was already delivered (or is already pending) is dropped.
     */
    enqueue(sessionId: string, item: ParkDeliveryItem<T>): ParkDeliveryRequest<T> | null {
      return enqueueAll(sessionId, [item]);
    },

    /**
     * Queue several items at once — all enter pending before any drain, so a
     * batch enqueued into an already-parked session goes out as one delivery.
     */
    enqueueAll,

    /**
     * Report the send outcome. A failed send re-queues for the next park.
     * Returns a new request when items queued during the just-finished delivery
     * need immediate dispatch (the session is still parked).
     */
    settle(request: ParkDeliveryRequest<T>, ok: boolean): ParkDeliveryRequest<T> | null {
      const state = session(request.sessionId);
      state.delivering = false;
      if (ok) {
        // Items may have queued while we were delivering; drain them now if
        // the session is still parked (no stream event will fire for them).
        if (state.parked) return drain(request.sessionId, state);
        return null;
      }
      for (const item of request.items) {
        state.delivered.delete(item.key);
        state.pending.set(item.key, item);
      }
      return null;
    },
  };
}

/**
 * The park-delivery state object: `observe` consumes stream events, `enqueue` /
 * `enqueueAll` queue items, `settle` reports send outcomes. Each method
 * returns a `ParkDeliveryRequest` exactly when a parked session has items ready.
 */
export type ParkDeliveryState<T> = ReturnType<typeof createParkDeliveryState<T>>;

// ---------------------------------------------------------------------------
// Notification bridge: how tool code (bash watchers, run_async completion
// notices) reaches the hook's delivery state from another module graph.
// Process-global and deduped on globalThis for the same reason as the task
// registry (see ./async-tasks.ts): eve's mid-session rebuilds duplicate module
// graphs, and a notification posted into one copy must reach the hook created
// in another. Posts made before any hook exists queue (bounded) and flush when
// the hook registers its handler.

/** A background notification for the model, delivered as its next user turn. */
export interface ParkNotification {
  /** Dedupe key (e.g. `task_3#2`); one delivery per key per session. */
  readonly key: string;
  /** The message text, complete and self-describing. */
  readonly text: string;
}

interface NotificationBridge {
  queued: Map<string, ParkNotification[]>;
  handler: ((sessionId: string, notification: ParkNotification) => void) | null;
}

const BRIDGE_KEY = Symbol.for("zocomputer.agent-sdk.park-notification-bridge");
// A session with no hook wired keeps at most this many queued notifications.
const MAX_QUEUED_PER_SESSION = 20;

function bridge(): NotificationBridge {
  const holder = globalThis as { [BRIDGE_KEY]?: NotificationBridge };
  holder[BRIDGE_KEY] ??= { queued: new Map(), handler: null };
  return holder[BRIDGE_KEY];
}

/** Test-only: drop the process-global bridge (handler + queued posts). */
export function __resetParkNotificationBridgeForTests(): void {
  const holder = globalThis as { [BRIDGE_KEY]?: NotificationBridge };
  delete holder[BRIDGE_KEY];
}

/**
 * Post a notification for a session. Delivered by the park-delivery hook when
 * the session parks (immediately, if it's parked right now). Without a hook
 * the post queues — bounded per session — and flushes when one registers.
 */
export function postParkNotification(
  sessionId: string,
  notification: ParkNotification,
): void {
  const b = bridge();
  if (b.handler) {
    b.handler(sessionId, notification);
    return;
  }
  const queue = b.queued.get(sessionId) ?? [];
  if (queue.length >= MAX_QUEUED_PER_SESSION) return;
  queue.push(notification);
  b.queued.set(sessionId, queue);
}

/**
 * Register the hook-side consumer (latest registration wins — a rebuilt hook
 * replaces its stale copy). Flushes any posts queued before registration.
 */
export function setParkNotificationHandler(
  handler: (sessionId: string, notification: ParkNotification) => void,
): void {
  const b = bridge();
  b.handler = handler;
  const queued = [...b.queued.entries()];
  b.queued.clear();
  for (const [sessionId, notifications] of queued) {
    for (const notification of notifications) handler(sessionId, notification);
  }
}
