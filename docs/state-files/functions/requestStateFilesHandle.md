[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / requestStateFilesHandle

# Function: requestStateFilesHandle()

> **requestStateFilesHandle**(`options`): `Promise`\<[`StateFilesHandle`](../interfaces/StateFilesHandle.md)\>

Defined in: [packages/agent-sdk/src/state-files.ts:121](https://github.com/zocomputer/zov2-code/blob/9d3f4b0b6ac2b9a8a8d1307a4590af07d0d7978f/packages/agent-sdk/src/state-files.ts#L121)

Requests a state-files handle from the runtime broker.
Throws `StateFilesHandleError` on failure or malformed response.

## Parameters

### options

[`RequestStateFilesHandleOptions`](../interfaces/RequestStateFilesHandleOptions.md)

## Returns

`Promise`\<[`StateFilesHandle`](../interfaces/StateFilesHandle.md)\>
