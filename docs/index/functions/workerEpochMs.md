[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / workerEpochMs

# Function: workerEpochMs()

> **workerEpochMs**(`now?`): `number`

Defined in: [packages/agent-sdk/src/orphaned-turns.ts:83](https://github.com/zocomputer/zov2-code/blob/8718aaa2765d9af21ff0cbb162dec35286dbcb11/packages/agent-sdk/src/orphaned-turns.ts#L83)

When the current worker realm started (ms since the Unix epoch), captured
on first call and stable for the realm's lifetime.

Anchored on `globalThis` (like the task registry and path locks) so eve's
mid-session module-graph rebuilds — which re-run module top levels within
the same realm — don't reset it; only a real worker restart (a new realm,
which is also what kills in-flight turns) starts a new epoch. That makes it
the correct "no turn started before this instant can still be live here"
boundary for [isOrphanedTurn](isOrphanedTurn.md).

`now` is injectable for tests; it only applies on the call that first
captures the epoch.

## Parameters

### now?

() => `number`

## Returns

`number`
