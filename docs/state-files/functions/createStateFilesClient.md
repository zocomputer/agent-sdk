[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / createStateFilesClient

# Function: createStateFilesClient()

> **createStateFilesClient**(`options`): [`StateFilesClient`](../interfaces/StateFilesClient.md)

Defined in: [packages/agent-sdk/src/state-files.ts:283](https://github.com/zocomputer/zov2-code/blob/fc65ac4f3ad029ed138ee11331693cba0bd295b4/packages/agent-sdk/src/state-files.ts#L283)

Creates a state-files client backed by a single static handle.
For credentials that expire, use `createRefreshingStateFilesClient` instead.

## Parameters

### options

[`CreateStateFilesClientOptions`](../interfaces/CreateStateFilesClientOptions.md)

## Returns

[`StateFilesClient`](../interfaces/StateFilesClient.md)
