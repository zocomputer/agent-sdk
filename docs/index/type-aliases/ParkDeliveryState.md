[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / ParkDeliveryState

# Type Alias: ParkDeliveryState\<T\>

> **ParkDeliveryState**\<`T`\> = `ReturnType`\<*typeof* [`createParkDeliveryState`](../functions/createParkDeliveryState.md)\>

Defined in: [packages/agent-sdk/src/park-delivery.ts:198](https://github.com/zocomputer/zov2-code/blob/3f2b99c534a9f8d96ad85214e02d7c759a75762c/packages/agent-sdk/src/park-delivery.ts#L198)

The park-delivery state object: `observe` consumes stream events, `enqueue` /
`enqueueAll` queue items, `settle` reports send outcomes. Each method
returns a `ParkDeliveryRequest` exactly when a parked session has items ready.

## Type Parameters

### T

`T`
