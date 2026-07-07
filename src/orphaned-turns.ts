// Ruling a mid-turn session dead. A harness worker restart (eve's structural
// reload, a redeploy, a crash) kills every in-flight step without writing a
// terminal event — the durable stream then ends mid-turn forever, and every
// status projection downstream reads "working" until something rules the turn
// dead. These helpers make that ruling by construction instead of by
// wall-clock heuristics: a genuinely live turn is always owned by the
// *current* worker realm (turns don't survive a realm death), so a session
// whose log still ends mid-turn with no events since this realm started
// cannot have a live turn.
//
// Intended sequencing (rib's session-reconcile is the canonical consumer):
// on worker start, tail-backfill each in-flight session from the durable
// stream, then apply `isOrphanedTurn` and persist the verdict. Two rules keep
// the verdict honest under concurrency:
// - mark with a compare-and-set on the log cursor (event count), so an event
//   that lands between the check and the write voids the ruling;
// - clear the verdict whenever a new event is recorded for the session — a
//   session that comes back to life (a fresh user message, park delivery)
//   sheds the stale ruling automatically.

/**
 * The evidence {@link isOrphanedTurn} weighs for one mid-turn session,
 * gathered after a tail backfill against the agent's durable stream.
 */
export interface OrphanedTurnInput {
  /**
   * Whether the tail backfill consulted the durable stream successfully. A
   * failed backfill means the missing terminal event may simply not have been
   * copied into the log yet — never rule on a log that could be behind.
   */
  readonly reconciled: boolean;
  /**
   * Whether the session's log still ends mid-turn (its last event is not a
   * turn-boundary event) after the backfill.
   */
  readonly inFlightAfter: boolean;
  /**
   * When the session's last recorded event was written (ms since the Unix
   * epoch), or `undefined` when unknown. Unknown never rules — a wrong "dead"
   * verdict invites the user to abandon or fork a live, expensive turn.
   */
  readonly lastEventAtMs: number | undefined;
  /**
   * When the current worker realm started (ms since the Unix epoch) — see
   * {@link workerEpochMs}.
   */
  readonly workerEpochMs: number;
}

/**
 * Whether a mid-turn session's turn is orphaned — dead with no terminal event
 * ever coming — and should be ruled dead.
 *
 * True only when all three hold: the tail backfill consulted the durable
 * stream (so the log isn't merely behind), the log still ends mid-turn, and
 * the last event predates the current worker realm. The epoch comparison is
 * the by-construction core: a live turn's events are written by this realm,
 * after it started, so a quiet-but-live turn (a long tool call, a big
 * prompt-cache read) can never be misruled no matter how long it goes silent.
 */
export function isOrphanedTurn(input: OrphanedTurnInput): boolean {
  if (!input.reconciled || !input.inFlightAfter) return false;
  if (input.lastEventAtMs === undefined) return false;
  return input.lastEventAtMs < input.workerEpochMs;
}

const WORKER_EPOCH_KEY = Symbol.for("zocomputer.agent-sdk.worker-epoch-ms");

/**
 * When the current worker realm started (ms since the Unix epoch), captured
 * on first call and stable for the realm's lifetime.
 *
 * Anchored on `globalThis` (like the task registry and path locks) so eve's
 * mid-session module-graph rebuilds — which re-run module top levels within
 * the same realm — don't reset it; only a real worker restart (a new realm,
 * which is also what kills in-flight turns) starts a new epoch. That makes it
 * the correct "no turn started before this instant can still be live here"
 * boundary for {@link isOrphanedTurn}.
 *
 * `now` is injectable for tests; it only applies on the call that first
 * captures the epoch.
 */
export function workerEpochMs(now: () => number = Date.now): number {
  const holder = globalThis as { [WORKER_EPOCH_KEY]?: number };
  holder[WORKER_EPOCH_KEY] ??= now();
  return holder[WORKER_EPOCH_KEY];
}

/**
 * Test-only reset for the worker-epoch capture, so suites can simulate a
 * fresh worker realm.
 */
export function __resetWorkerEpochForTests(): void {
  const holder = globalThis as { [WORKER_EPOCH_KEY]?: number };
  delete holder[WORKER_EPOCH_KEY];
}
