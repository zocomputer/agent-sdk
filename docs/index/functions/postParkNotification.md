[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / postParkNotification

# Function: postParkNotification()

> **postParkNotification**(`sessionId`, `notification`): `void`

Defined in: [packages/agent-sdk/src/park-delivery.ts:236](https://github.com/zocomputer/zov2-code/blob/ce93d09ec2812425a1522360ec5d53274fce9d8d/packages/agent-sdk/src/park-delivery.ts#L236)

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
