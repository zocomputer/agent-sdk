[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / postParkNotification

# Function: postParkNotification()

> **postParkNotification**(`sessionId`, `notification`): `void`

Defined in: [packages/agent-sdk/src/park-delivery.ts:243](https://github.com/zocomputer/zov2-code/blob/a8636edc2f6184e686ebe291b26c3e5e9b3ae7ef/packages/agent-sdk/src/park-delivery.ts#L243)

Post a notification for a session. Delivered by the park-delivery hook when
the session parks (immediately, if it's parked right now). Without a hook
the post queues — bounded per session — and flushes when one registers.

## Parameters

### sessionId

`string`

### notification

[`ParkNotification`](../interfaces/ParkNotification.md)

## Returns

`void`
