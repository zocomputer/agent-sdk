[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / shouldRefreshStateSandboxHandle

# Function: shouldRefreshStateSandboxHandle()

> **shouldRefreshStateSandboxHandle**(`handle`, `now`, `refreshWindowMs?`): `boolean`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:653](https://github.com/zocomputer/zov2-code/blob/f537e0a90da222390e69bcbf7e329142b9e8d4b0/packages/agent-sdk/src/state-sandbox.ts#L653)

Checks whether a sandbox handle should be refreshed based on its SSH access expiry.
Returns `true` if the handle expires within the refresh window or has an invalid expiry timestamp.

## Parameters

### handle

[`StateSandboxHandle`](../interfaces/StateSandboxHandle.md)

### now

`Date`

### refreshWindowMs?

`number` = `60_000`

## Returns

`boolean`
