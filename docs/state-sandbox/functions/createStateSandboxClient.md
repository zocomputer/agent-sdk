[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / createStateSandboxClient

# Function: createStateSandboxClient()

> **createStateSandboxClient**(`options`): [`StateSandboxClient`](../interfaces/StateSandboxClient.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:396](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/state-sandbox.ts#L396)

Creates a sandbox client that automatically renews its handle and caches the underlying session.
Manages handle expiry, session disposal, and request queuing transparently.

## Parameters

### options

[`CreateStateSandboxClientOptions`](../interfaces/CreateStateSandboxClientOptions.md)

## Returns

[`StateSandboxClient`](../interfaces/StateSandboxClient.md)
