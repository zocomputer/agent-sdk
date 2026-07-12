[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / setParkNotificationHandler

# Function: setParkNotificationHandler()

> **setParkNotificationHandler**(`handler`): `void`

Defined in: [packages/agent-sdk/src/park-delivery.ts:261](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/park-delivery.ts#L261)

Register the hook-side consumer (latest registration wins — a rebuilt hook
replaces its stale copy). Flushes any posts queued before registration.

## Parameters

### handler

(`sessionId`, `notification`) => `void`

## Returns

`void`
