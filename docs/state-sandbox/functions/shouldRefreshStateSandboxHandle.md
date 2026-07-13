[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / shouldRefreshStateSandboxHandle

# Function: shouldRefreshStateSandboxHandle()

> **shouldRefreshStateSandboxHandle**(`handle`, `now`, `refreshWindowMs?`): `boolean`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:649](https://github.com/zocomputer/zov2-code/blob/561b0153afcd985ff89c43386656aa6cb1d2502e/packages/agent-sdk/src/state-sandbox.ts#L649)

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
