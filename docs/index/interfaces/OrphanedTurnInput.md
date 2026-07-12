[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / OrphanedTurnInput

# Interface: OrphanedTurnInput

Defined in: [packages/agent-sdk/src/orphaned-turns.ts:25](https://github.com/zocomputer/zov2-code/blob/6c8f0491294917993809515b241a9263669c5f1d/packages/agent-sdk/src/orphaned-turns.ts#L25)

The evidence [isOrphanedTurn](../functions/isOrphanedTurn.md) weighs for one mid-turn session,
gathered after a tail backfill against the agent's durable stream.

## Properties

### inFlightAfter

> `readonly` **inFlightAfter**: `boolean`

Defined in: [packages/agent-sdk/src/orphaned-turns.ts:36](https://github.com/zocomputer/zov2-code/blob/6c8f0491294917993809515b241a9263669c5f1d/packages/agent-sdk/src/orphaned-turns.ts#L36)

Whether the session's log still ends mid-turn (its last event is not a
turn-boundary event) after the backfill.

***

### lastEventAtMs

> `readonly` **lastEventAtMs**: `number` \| `undefined`

Defined in: [packages/agent-sdk/src/orphaned-turns.ts:42](https://github.com/zocomputer/zov2-code/blob/6c8f0491294917993809515b241a9263669c5f1d/packages/agent-sdk/src/orphaned-turns.ts#L42)

When the session's last recorded event was written (ms since the Unix
epoch), or `undefined` when unknown. Unknown never rules — a wrong "dead"
verdict invites the user to abandon or fork a live, expensive turn.

***

### reconciled

> `readonly` **reconciled**: `boolean`

Defined in: [packages/agent-sdk/src/orphaned-turns.ts:31](https://github.com/zocomputer/zov2-code/blob/6c8f0491294917993809515b241a9263669c5f1d/packages/agent-sdk/src/orphaned-turns.ts#L31)

Whether the tail backfill consulted the durable stream successfully. A
failed backfill means the missing terminal event may simply not have been
copied into the log yet — never rule on a log that could be behind.

***

### workerEpochMs

> `readonly` **workerEpochMs**: `number`

Defined in: [packages/agent-sdk/src/orphaned-turns.ts:47](https://github.com/zocomputer/zov2-code/blob/6c8f0491294917993809515b241a9263669c5f1d/packages/agent-sdk/src/orphaned-turns.ts#L47)

When the current worker realm started (ms since the Unix epoch) — see
[workerEpochMs](../functions/workerEpochMs.md).
