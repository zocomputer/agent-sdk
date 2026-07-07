[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / ParkDeliveryItem

# Interface: ParkDeliveryItem\<T\>

Defined in: [packages/agent-sdk/src/park-delivery.ts:49](https://github.com/zocomputer/zov2-code/blob/df4b939a34db36cf82bffe0187f8c98f4e308c18/packages/agent-sdk/src/park-delivery.ts#L49)

One item queued for park delivery: a dedupe key plus its payload. An item
with a key already delivered (or currently pending) is dropped.

## Type Parameters

### T

`T`

## Properties

### key

> `readonly` **key**: `string`

Defined in: [packages/agent-sdk/src/park-delivery.ts:51](https://github.com/zocomputer/zov2-code/blob/df4b939a34db36cf82bffe0187f8c98f4e308c18/packages/agent-sdk/src/park-delivery.ts#L51)

Dedupe key: an item delivers at most once per session per process.

***

### payload

> `readonly` **payload**: `T`

Defined in: [packages/agent-sdk/src/park-delivery.ts:52](https://github.com/zocomputer/zov2-code/blob/df4b939a34db36cf82bffe0187f8c98f4e308c18/packages/agent-sdk/src/park-delivery.ts#L52)
