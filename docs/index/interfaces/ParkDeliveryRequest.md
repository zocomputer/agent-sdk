[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / ParkDeliveryRequest

# Interface: ParkDeliveryRequest\<T\>

Defined in: [packages/agent-sdk/src/park-delivery.ts:53](https://github.com/zocomputer/zov2-code/blob/6ab5ae927225cb2a14ac9cd70c43ecf9eb01921d/packages/agent-sdk/src/park-delivery.ts#L53)

A park-delivery flush: the session id, its client-facing continuation token,
and the batch of items ready to deliver. The caller performs the send and
reports back with `settle`.

## Type Parameters

### T

`T`

## Properties

### continuationToken

> `readonly` **continuationToken**: `string`

Defined in: [packages/agent-sdk/src/park-delivery.ts:55](https://github.com/zocomputer/zov2-code/blob/6ab5ae927225cb2a14ac9cd70c43ecf9eb01921d/packages/agent-sdk/src/park-delivery.ts#L55)

***

### items

> `readonly` **items**: readonly [`ParkDeliveryItem`](ParkDeliveryItem.md)\<`T`\>[]

Defined in: [packages/agent-sdk/src/park-delivery.ts:56](https://github.com/zocomputer/zov2-code/blob/6ab5ae927225cb2a14ac9cd70c43ecf9eb01921d/packages/agent-sdk/src/park-delivery.ts#L56)

***

### sessionId

> `readonly` **sessionId**: `string`

Defined in: [packages/agent-sdk/src/park-delivery.ts:54](https://github.com/zocomputer/zov2-code/blob/6ab5ae927225cb2a14ac9cd70c43ecf9eb01921d/packages/agent-sdk/src/park-delivery.ts#L54)
