[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / ParkDeliveryRequest

# Interface: ParkDeliveryRequest\<T\>

Defined in: [packages/agent-sdk/src/park-delivery.ts:60](https://github.com/zocomputer/zov2-code/blob/94be7c286c5c8961c9d40350c41cf663e8ab4554/packages/agent-sdk/src/park-delivery.ts#L60)

A park-delivery flush: the session id, its client-facing continuation token,
and the batch of items ready to deliver. The caller performs the send and
reports back with `settle`.

## Type Parameters

### T

`T`

## Properties

### continuationToken

> `readonly` **continuationToken**: `string`

Defined in: [packages/agent-sdk/src/park-delivery.ts:62](https://github.com/zocomputer/zov2-code/blob/94be7c286c5c8961c9d40350c41cf663e8ab4554/packages/agent-sdk/src/park-delivery.ts#L62)

***

### items

> `readonly` **items**: readonly [`ParkDeliveryItem`](ParkDeliveryItem.md)\<`T`\>[]

Defined in: [packages/agent-sdk/src/park-delivery.ts:63](https://github.com/zocomputer/zov2-code/blob/94be7c286c5c8961c9d40350c41cf663e8ab4554/packages/agent-sdk/src/park-delivery.ts#L63)

***

### sessionId

> `readonly` **sessionId**: `string`

Defined in: [packages/agent-sdk/src/park-delivery.ts:61](https://github.com/zocomputer/zov2-code/blob/94be7c286c5c8961c9d40350c41cf663e8ab4554/packages/agent-sdk/src/park-delivery.ts#L61)
