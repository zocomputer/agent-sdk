[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createParkDeliveryHook

# Function: createParkDeliveryHook()

> **createParkDeliveryHook**(`options?`): `object`

Defined in: [packages/agent-sdk/src/hooks.ts:106](https://github.com/zocomputer/zov2-code/blob/aba140d6dd71d0ea05075bf6e9ebcc5739f7a7b3/packages/agent-sdk/src/hooks.ts#L106)

Build the park-delivery hook that sends read media, notifications, and steered messages when a session parks.

## Parameters

### options?

[`ParkDeliveryOptions`](../interfaces/ParkDeliveryOptions.md) = `{}`

## Returns

`object`

### events

> **events**: `object`

#### events.\*()

> **\***(`event`, `ctx`): `void`

Observe every stream event to detect parks and queue deliveries.

##### Parameters

###### event

`HandleMessageStreamEvent`

###### ctx

`HookContext`

##### Returns

`void`
