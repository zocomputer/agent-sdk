[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / ParkDeliveryItem

# Interface: ParkDeliveryItem\<T\>

Defined in: [packages/agent-sdk/src/park-delivery.ts:42](https://github.com/zocomputer/zov2-code/blob/ce93d09ec2812425a1522360ec5d53274fce9d8d/packages/agent-sdk/src/park-delivery.ts#L42)

One item queued for park delivery: a dedupe key plus its payload. An item
with a key already delivered (or currently pending) is dropped.

## Type Parameters

### T

`T`

## Properties

### key

> `readonly` **key**: `string`

Defined in: [packages/agent-sdk/src/park-delivery.ts:44](https://github.com/zocomputer/zov2-code/blob/ce93d09ec2812425a1522360ec5d53274fce9d8d/packages/agent-sdk/src/park-delivery.ts#L44)

Dedupe key: an item delivers at most once per session per process.

***

### payload

> `readonly` **payload**: `T`

Defined in: [packages/agent-sdk/src/park-delivery.ts:45](https://github.com/zocomputer/zov2-code/blob/ce93d09ec2812425a1522360ec5d53274fce9d8d/packages/agent-sdk/src/park-delivery.ts#L45)
