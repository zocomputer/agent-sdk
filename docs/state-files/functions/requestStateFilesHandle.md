[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / requestStateFilesHandle

# Function: requestStateFilesHandle()

> **requestStateFilesHandle**(`options`): `Promise`\<[`StateFilesHandle`](../interfaces/StateFilesHandle.md)\>

Defined in: [packages/agent-sdk/src/state-files.ts:116](https://github.com/zocomputer/zov2-code/blob/1fcc8b4b31cf28b6badb9d28c6512cd9261c730c/packages/agent-sdk/src/state-files.ts#L116)

Requests a state-files handle from the runtime broker.
Throws `StateFilesHandleError` on failure or malformed response.

## Parameters

### options

[`RequestStateFilesHandleOptions`](../interfaces/RequestStateFilesHandleOptions.md)

## Returns

`Promise`\<[`StateFilesHandle`](../interfaces/StateFilesHandle.md)\>
