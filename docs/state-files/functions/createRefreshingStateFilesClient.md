[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / createRefreshingStateFilesClient

# Function: createRefreshingStateFilesClient()

> **createRefreshingStateFilesClient**(`options`): [`StateFilesClient`](../interfaces/StateFilesClient.md)

Defined in: [packages/agent-sdk/src/state-files.ts:300](https://github.com/zocomputer/zov2-code/blob/76a0c7e372069bfa29a1d30375fdc2f67f746411/packages/agent-sdk/src/state-files.ts#L300)

Creates a state-files client that reloads the handle when it nears expiration.
Checks before each operation; if the handle expires within `refreshWindowMs`, calls `loadHandle`.

## Parameters

### options

[`CreateRefreshingStateFilesClientOptions`](../interfaces/CreateRefreshingStateFilesClientOptions.md)

## Returns

[`StateFilesClient`](../interfaces/StateFilesClient.md)
