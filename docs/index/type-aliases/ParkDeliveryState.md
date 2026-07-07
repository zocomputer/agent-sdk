[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / ParkDeliveryState

# Type Alias: ParkDeliveryState\<T\>

> **ParkDeliveryState**\<`T`\> = `ReturnType`\<*typeof* [`createParkDeliveryState`](../functions/createParkDeliveryState.md)\>

Defined in: [packages/agent-sdk/src/park-delivery.ts:191](https://github.com/zocomputer/zov2-code/blob/6ab5ae927225cb2a14ac9cd70c43ecf9eb01921d/packages/agent-sdk/src/park-delivery.ts#L191)

The park-delivery state object: `observe` consumes stream events, `enqueue` /
`enqueueAll` queue items, `settle` reports send outcomes. Each method
returns a `ParkDeliveryRequest` exactly when a parked session has items ready.

## Type Parameters

### T

`T`
