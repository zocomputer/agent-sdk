[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / createRefreshingStateFilesClient

# Function: createRefreshingStateFilesClient()

> **createRefreshingStateFilesClient**(`options`): [`StateFilesClient`](../interfaces/StateFilesClient.md)

Defined in: [packages/agent-sdk/src/state-files.ts:282](https://github.com/zocomputer/zov2-code/blob/df4b939a34db36cf82bffe0187f8c98f4e308c18/packages/agent-sdk/src/state-files.ts#L282)

Creates a state-files client that reloads the handle when it nears expiration.
Checks before each operation; if the handle expires within `refreshWindowMs`, calls `loadHandle`.

## Parameters

### options

[`CreateRefreshingStateFilesClientOptions`](../interfaces/CreateRefreshingStateFilesClientOptions.md)

## Returns

[`StateFilesClient`](../interfaces/StateFilesClient.md)
