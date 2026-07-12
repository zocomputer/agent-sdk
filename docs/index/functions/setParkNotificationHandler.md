[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / setParkNotificationHandler

# Function: setParkNotificationHandler()

> **setParkNotificationHandler**(`handler`): `void`

Defined in: [packages/agent-sdk/src/park-delivery.ts:261](https://github.com/zocomputer/zov2-code/blob/1fcc8b4b31cf28b6badb9d28c6512cd9261c730c/packages/agent-sdk/src/park-delivery.ts#L261)

Register the hook-side consumer (latest registration wins — a rebuilt hook
replaces its stale copy). Flushes any posts queued before registration.

## Parameters

### handler

(`sessionId`, `notification`) => `void`

## Returns

`void`
