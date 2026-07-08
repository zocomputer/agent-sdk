[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / setParkNotificationHandler

# Function: setParkNotificationHandler()

> **setParkNotificationHandler**(`handler`): `void`

Defined in: [packages/agent-sdk/src/park-delivery.ts:262](https://github.com/zocomputer/zov2-code/blob/3f2b99c534a9f8d96ad85214e02d7c759a75762c/packages/agent-sdk/src/park-delivery.ts#L262)

Register the hook-side consumer (latest registration wins — a rebuilt hook
replaces its stale copy). Flushes any posts queued before registration.

## Parameters

### handler

(`sessionId`, `notification`) => `void`

## Returns

`void`
