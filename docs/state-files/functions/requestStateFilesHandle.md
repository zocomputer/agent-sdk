[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / requestStateFilesHandle

# Function: requestStateFilesHandle()

> **requestStateFilesHandle**(`options`): `Promise`\<[`StateFilesHandle`](../interfaces/StateFilesHandle.md)\>

Defined in: [packages/agent-sdk/src/state-files.ts:116](https://github.com/zocomputer/zov2-code/blob/384c0715e5dbd68ec5614af4167eaef9b0b6e0cd/packages/agent-sdk/src/state-files.ts#L116)

Requests a state-files handle from the runtime broker.
Throws `StateFilesHandleError` on failure or malformed response.

## Parameters

### options

[`RequestStateFilesHandleOptions`](../interfaces/RequestStateFilesHandleOptions.md)

## Returns

`Promise`\<[`StateFilesHandle`](../interfaces/StateFilesHandle.md)\>
