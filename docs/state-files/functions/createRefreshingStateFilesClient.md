[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / createRefreshingStateFilesClient

# Function: createRefreshingStateFilesClient()

> **createRefreshingStateFilesClient**(`options`): [`StateFilesClient`](../interfaces/StateFilesClient.md)

Defined in: [packages/agent-sdk/src/state-files.ts:300](https://github.com/zocomputer/zov2-code/blob/b7f06ca2cf0142cf87a67d683e96ae88d6c29abe/packages/agent-sdk/src/state-files.ts#L300)

Creates a state-files client that reloads the handle when it nears expiration.
Checks before each operation; if the handle expires within `refreshWindowMs`, calls `loadHandle`.

## Parameters

### options

[`CreateRefreshingStateFilesClientOptions`](../interfaces/CreateRefreshingStateFilesClientOptions.md)

## Returns

[`StateFilesClient`](../interfaces/StateFilesClient.md)
