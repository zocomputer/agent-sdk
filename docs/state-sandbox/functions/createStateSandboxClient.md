[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / createStateSandboxClient

# Function: createStateSandboxClient()

> **createStateSandboxClient**(`options`): [`StateSandboxClient`](../interfaces/StateSandboxClient.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:449](https://github.com/zocomputer/zov2-code/blob/af9677372192b613a9430e022ed9c3a186791633/packages/agent-sdk/src/state-sandbox.ts#L449)

Creates a sandbox client that automatically renews its handle and caches the underlying session.
Manages handle expiry, session disposal, and request queuing transparently.

## Parameters

### options

[`CreateStateSandboxClientOptions`](../interfaces/CreateStateSandboxClientOptions.md)

## Returns

[`StateSandboxClient`](../interfaces/StateSandboxClient.md)
