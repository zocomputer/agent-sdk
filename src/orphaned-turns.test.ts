import { describe, expect, test, afterEach } from "bun:test";
import {
  __resetWorkerEpochForTests,
  isOrphanedTurn,
  workerEpochMs,
} from "./orphaned-turns";

describe("isOrphanedTurn", () => {
  const base = {
    reconciled: true,
    inFlightAfter: true,
    lastEventAtMs: 1_000,
    workerEpochMs: 2_000,
  };

  test("rules dead: reconciled, still mid-turn, last event before the epoch", () => {
    expect(isOrphanedTurn(base)).toBe(true);
  });

  test("never rules when the backfill failed (log could be behind)", () => {
    expect(isOrphanedTurn({ ...base, reconciled: false })).toBe(false);
  });

  test("never rules a settled session", () => {
    expect(isOrphanedTurn({ ...base, inFlightAfter: false })).toBe(false);
  });

  test("never rules on an unknown last-event time", () => {
    expect(isOrphanedTurn({ ...base, lastEventAtMs: undefined })).toBe(false);
  });

  test("never rules a turn whose events were written by this realm", () => {
    // A live turn's events land after the epoch — even a long-quiet one.
    expect(isOrphanedTurn({ ...base, lastEventAtMs: 2_000 })).toBe(false);
    expect(isOrphanedTurn({ ...base, lastEventAtMs: 3_000 })).toBe(false);
  });
});

describe("workerEpochMs", () => {
  afterEach(() => {
    __resetWorkerEpochForTests();
  });

  test("captures on first call and stays stable", () => {
    __resetWorkerEpochForTests();
    const first = workerEpochMs(() => 42);
    expect(first).toBe(42);
    // A later call with a different clock returns the captured epoch — a
    // module-graph rebuild re-calling this must not move the boundary.
    expect(workerEpochMs(() => 99)).toBe(42);
  });

  test("a realm reset (test-only) starts a new epoch", () => {
    __resetWorkerEpochForTests();
    expect(workerEpochMs(() => 1)).toBe(1);
    __resetWorkerEpochForTests();
    expect(workerEpochMs(() => 2)).toBe(2);
  });
});
