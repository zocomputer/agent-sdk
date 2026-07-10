[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / buildRedeliveryMessage

# Function: buildRedeliveryMessage()

> **buildRedeliveryMessage**(`pending`): [`RedeliveryMessagePart`](../type-aliases/RedeliveryMessagePart.md)[]

Defined in: [packages/agent-sdk/src/redeliver.ts:67](https://github.com/zocomputer/zov2-code/blob/f60be6793ffd6089caaf80014c136f326348f4b1/packages/agent-sdk/src/redeliver.ts#L67)

Build the user turn that carries the pending media. A short text part names
the files (so transcripts show what arrived); the file parts carry the
bytes the model was promised by read's "queued" note.

## Parameters

### pending

readonly [`PendingRedelivery`](../interfaces/PendingRedelivery.md)[]

## Returns

[`RedeliveryMessagePart`](../type-aliases/RedeliveryMessagePart.md)[]
