[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / createStateFilesClient

# Function: createStateFilesClient()

> **createStateFilesClient**(`options`): [`StateFilesClient`](../interfaces/StateFilesClient.md)

Defined in: [packages/agent-sdk/src/state-files.ts:260](https://github.com/zocomputer/zov2-code/blob/df4b939a34db36cf82bffe0187f8c98f4e308c18/packages/agent-sdk/src/state-files.ts#L260)

Creates a state-files client backed by a single static handle.
For credentials that expire, use `createRefreshingStateFilesClient` instead.

## Parameters

### options

[`CreateStateFilesClientOptions`](../interfaces/CreateStateFilesClientOptions.md)

## Returns

[`StateFilesClient`](../interfaces/StateFilesClient.md)
