[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / setParkNotificationHandler

# Function: setParkNotificationHandler()

> **setParkNotificationHandler**(`handler`): `void`

Defined in: [packages/agent-sdk/src/park-delivery.ts:262](https://github.com/zocomputer/zov2-code/blob/6c8f0491294917993809515b241a9263669c5f1d/packages/agent-sdk/src/park-delivery.ts#L262)

Register the hook-side consumer (latest registration wins — a rebuilt hook
replaces its stale copy). Flushes any posts queued before registration.

## Parameters

### handler

(`sessionId`, `notification`) => `void`

## Returns

`void`
