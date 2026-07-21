[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / shouldRefreshStateFilesHandle

# Function: shouldRefreshStateFilesHandle()

> **shouldRefreshStateFilesHandle**(`handle`, `now`, `refreshWindowMs?`): `boolean`

Defined in: [packages/agent-sdk/src/state-files.ts:326](https://github.com/zocomputer/zov2-code/blob/48650141bb7b851495928e6463ae438988b79a49/packages/agent-sdk/src/state-files.ts#L326)

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
