[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / setParkNotificationHandler

# Function: setParkNotificationHandler()

> **setParkNotificationHandler**(`handler`): `void`

Defined in: [packages/agent-sdk/src/park-delivery.ts:262](https://github.com/zocomputer/zov2-code/blob/b1083703742c40f0a33149c0d589f9948d72aea2/packages/agent-sdk/src/park-delivery.ts#L262)

Register the hook-side consumer (latest registration wins — a rebuilt hook
replaces its stale copy). Flushes any posts queued before registration.

## Parameters

### handler

(`sessionId`, `notification`) => `void`

## Returns

`void`
