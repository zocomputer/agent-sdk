[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / ParkDeliveryState

# Type Alias: ParkDeliveryState\<T\>

> **ParkDeliveryState**\<`T`\> = `ReturnType`\<*typeof* [`createParkDeliveryState`](../functions/createParkDeliveryState.md)\>

Defined in: [packages/agent-sdk/src/park-delivery.ts:197](https://github.com/zocomputer/zov2-code/blob/1fcc8b4b31cf28b6badb9d28c6512cd9261c730c/packages/agent-sdk/src/park-delivery.ts#L197)

The park-delivery state object: `observe` consumes stream events, `enqueue` /
`enqueueAll` queue items, `settle` reports send outcomes. Each method
returns a `ParkDeliveryRequest` exactly when a parked session has items ready.

## Type Parameters

### T

`T`
