[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / shouldRefreshStateFilesHandle

# Function: shouldRefreshStateFilesHandle()

> **shouldRefreshStateFilesHandle**(`handle`, `now`, `refreshWindowMs?`): `boolean`

Defined in: [packages/agent-sdk/src/state-files.ts:321](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/state-files.ts#L321)

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
