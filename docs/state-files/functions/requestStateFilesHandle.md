[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / requestStateFilesHandle

# Function: requestStateFilesHandle()

> **requestStateFilesHandle**(`options`): `Promise`\<[`StateFilesHandle`](../interfaces/StateFilesHandle.md)\>

Defined in: [packages/agent-sdk/src/state-files.ts:101](https://github.com/zocomputer/zov2-code/blob/ce93d09ec2812425a1522360ec5d53274fce9d8d/packages/agent-sdk/src/state-files.ts#L101)

Requests a state-files handle from the runtime broker.
Throws `StateFilesHandleError` on failure or malformed response.

## Parameters

### options

[`RequestStateFilesHandleOptions`](../interfaces/RequestStateFilesHandleOptions.md)

## Returns

`Promise`\<[`StateFilesHandle`](../interfaces/StateFilesHandle.md)\>
