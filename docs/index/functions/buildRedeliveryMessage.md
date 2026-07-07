[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / buildRedeliveryMessage

# Function: buildRedeliveryMessage()

> **buildRedeliveryMessage**(`pending`): [`RedeliveryMessagePart`](../type-aliases/RedeliveryMessagePart.md)[]

Defined in: [packages/agent-sdk/src/redeliver.ts:67](https://github.com/zocomputer/zov2-code/blob/94be7c286c5c8961c9d40350c41cf663e8ab4554/packages/agent-sdk/src/redeliver.ts#L67)

Build the user turn that carries the pending media. A short text part names
the files (so transcripts show what arrived); the file parts carry the
bytes the model was promised by read's "queued" note.

## Parameters

### pending

readonly [`PendingRedelivery`](../interfaces/PendingRedelivery.md)[]

## Returns

[`RedeliveryMessagePart`](../type-aliases/RedeliveryMessagePart.md)[]
