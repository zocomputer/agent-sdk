[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / postParkNotification

# Function: postParkNotification()

> **postParkNotification**(`sessionId`, `notification`): `void`

Defined in: [packages/agent-sdk/src/park-delivery.ts:242](https://github.com/zocomputer/zov2-code/blob/440b57200b266cf1c7309b270db9220db760c77a/packages/agent-sdk/src/park-delivery.ts#L242)

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
