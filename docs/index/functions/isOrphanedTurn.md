[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / isOrphanedTurn

# Function: isOrphanedTurn()

> **isOrphanedTurn**(`input`): `boolean`

Defined in: [packages/agent-sdk/src/orphaned-turns.ts:61](https://github.com/zocomputer/zov2-code/blob/d22a2863f30f9fa1a7f8dbb051f97b4846076bf1/packages/agent-sdk/src/orphaned-turns.ts#L61)

Whether a mid-turn session's turn is orphaned — dead with no terminal event
ever coming — and should be ruled dead.

True only when all three hold: the tail backfill consulted the durable
stream (so the log isn't merely behind), the log still ends mid-turn, and
the last event predates the current worker realm. The epoch comparison is
the by-construction core: a live turn's events are written by this realm,
after it started, so a quiet-but-live turn (a long tool call, a big
prompt-cache read) can never be misruled no matter how long it goes silent.

## Parameters

### input

[`OrphanedTurnInput`](../interfaces/OrphanedTurnInput.md)

## Returns

`boolean`
