[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / ParkDeliveryState

# Type Alias: ParkDeliveryState\<T\>

> **ParkDeliveryState**\<`T`\> = `ReturnType`\<*typeof* [`createParkDeliveryState`](../functions/createParkDeliveryState.md)\>

Defined in: [packages/agent-sdk/src/park-delivery.ts:191](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/park-delivery.ts#L191)

The park-delivery state object: `observe` consumes stream events, `enqueue` /
`enqueueAll` queue items, `settle` reports send outcomes. Each method
returns a `ParkDeliveryRequest` exactly when a parked session has items ready.

## Type Parameters

### T

`T`
