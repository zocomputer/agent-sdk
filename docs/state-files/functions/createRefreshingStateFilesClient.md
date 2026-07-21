[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / createRefreshingStateFilesClient

# Function: createRefreshingStateFilesClient()

> **createRefreshingStateFilesClient**(`options`): [`StateFilesClient`](../interfaces/StateFilesClient.md)

Defined in: [packages/agent-sdk/src/state-files.ts:305](https://github.com/zocomputer/zov2-code/blob/431612973a5c06efcad7920699932d7fe7145ddd/packages/agent-sdk/src/state-files.ts#L305)

Creates a state-files client that reloads the handle when it nears expiration.
Checks before each operation; if the handle expires within `refreshWindowMs`, calls `loadHandle`.

## Parameters

### options

[`CreateRefreshingStateFilesClientOptions`](../interfaces/CreateRefreshingStateFilesClientOptions.md)

## Returns

[`StateFilesClient`](../interfaces/StateFilesClient.md)
