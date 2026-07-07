[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / shouldRefreshStateFilesHandle

# Function: shouldRefreshStateFilesHandle()

> **shouldRefreshStateFilesHandle**(`handle`, `now`, `refreshWindowMs?`): `boolean`

Defined in: [packages/agent-sdk/src/state-files.ts:303](https://github.com/zocomputer/zov2-code/blob/ce93d09ec2812425a1522360ec5d53274fce9d8d/packages/agent-sdk/src/state-files.ts#L303)

Determines whether a state-files handle needs refreshing based on its expiration.
Returns `true` if the handle expires within `refreshWindowMs` or if `expiresAt` is malformed.

## Parameters

### handle

[`StateFilesHandle`](../interfaces/StateFilesHandle.md)

### now

`Date`

### refreshWindowMs?

`number` = `60_000`

## Returns

`boolean`
