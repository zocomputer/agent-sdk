[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / createStateFilesClient

# Function: createStateFilesClient()

> **createStateFilesClient**(`options`): [`StateFilesClient`](../interfaces/StateFilesClient.md)

Defined in: [packages/agent-sdk/src/state-files.ts:278](https://github.com/zocomputer/zov2-code/blob/2f6c8cc3fd1672c6cd6d12c28dbf229ac82949b0/packages/agent-sdk/src/state-files.ts#L278)

Creates a state-files client backed by a single static handle.
For credentials that expire, use `createRefreshingStateFilesClient` instead.

## Parameters

### options

[`CreateStateFilesClientOptions`](../interfaces/CreateStateFilesClientOptions.md)

## Returns

[`StateFilesClient`](../interfaces/StateFilesClient.md)
