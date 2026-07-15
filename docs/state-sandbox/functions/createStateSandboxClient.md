[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / createStateSandboxClient

# Function: createStateSandboxClient()

> **createStateSandboxClient**(`options`): [`StateSandboxClient`](../interfaces/StateSandboxClient.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:396](https://github.com/zocomputer/zov2-code/blob/8ddca74b7284f16fe6a147e3eb2a55bed9838617/packages/agent-sdk/src/state-sandbox.ts#L396)

Creates a sandbox client that automatically renews its handle and caches the underlying session.
Manages handle expiry, session disposal, and request queuing transparently.

## Parameters

### options

[`CreateStateSandboxClientOptions`](../interfaces/CreateStateSandboxClientOptions.md)

## Returns

[`StateSandboxClient`](../interfaces/StateSandboxClient.md)
