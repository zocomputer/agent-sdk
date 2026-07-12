[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / createStateSandboxClient

# Function: createStateSandboxClient()

> **createStateSandboxClient**(`options`): [`StateSandboxClient`](../interfaces/StateSandboxClient.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:396](https://github.com/zocomputer/zov2-code/blob/6c8f0491294917993809515b241a9263669c5f1d/packages/agent-sdk/src/state-sandbox.ts#L396)

Creates a sandbox client that automatically renews its handle and caches the underlying session.
Manages handle expiry, session disposal, and request queuing transparently.

## Parameters

### options

[`CreateStateSandboxClientOptions`](../interfaces/CreateStateSandboxClientOptions.md)

## Returns

[`StateSandboxClient`](../interfaces/StateSandboxClient.md)
