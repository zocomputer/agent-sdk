[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / ParkDeliveryItem

# Interface: ParkDeliveryItem\<T\>

Defined in: [packages/agent-sdk/src/park-delivery.ts:48](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/park-delivery.ts#L48)

One item queued for park delivery: a dedupe key plus its payload. An item
with a key already delivered (or currently pending) is dropped.

## Type Parameters

### T

`T`

## Properties

### key

> `readonly` **key**: `string`

Defined in: [packages/agent-sdk/src/park-delivery.ts:50](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/park-delivery.ts#L50)

Dedupe key: an item delivers at most once per session per process.

***

### payload

> `readonly` **payload**: `T`

Defined in: [packages/agent-sdk/src/park-delivery.ts:51](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/park-delivery.ts#L51)
