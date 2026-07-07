[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / requestStateFilesHandle

# Function: requestStateFilesHandle()

> **requestStateFilesHandle**(`options`): `Promise`\<[`StateFilesHandle`](../interfaces/StateFilesHandle.md)\>

Defined in: [packages/agent-sdk/src/state-files.ts:101](https://github.com/zocomputer/zov2-code/blob/df4b939a34db36cf82bffe0187f8c98f4e308c18/packages/agent-sdk/src/state-files.ts#L101)

Requests a state-files handle from the runtime broker.
Throws `StateFilesHandleError` on failure or malformed response.

## Parameters

### options

[`RequestStateFilesHandleOptions`](../interfaces/RequestStateFilesHandleOptions.md)

## Returns

`Promise`\<[`StateFilesHandle`](../interfaces/StateFilesHandle.md)\>
