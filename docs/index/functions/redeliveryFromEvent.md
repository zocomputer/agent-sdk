[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / redeliveryFromEvent

# Function: redeliveryFromEvent()

> **redeliveryFromEvent**(`event`): [`PendingRedelivery`](../interfaces/PendingRedelivery.md) \| `null`

Defined in: [packages/agent-sdk/src/redeliver.ts:41](https://github.com/zocomputer/zov2-code/blob/d22a2863f30f9fa1a7f8dbb051f97b4846076bf1/packages/agent-sdk/src/redeliver.ts#L41)

Extract a read-media attachment from an `action.result` stream event, if the
completed tool's raw output carries one. Structural (no eve types) and
tool-name-agnostic: any tool that returns a `CHAT_ATTACHMENT_FIELD` payload
participates.

## Parameters

### event

`unknown`

## Returns

[`PendingRedelivery`](../interfaces/PendingRedelivery.md) \| `null`
