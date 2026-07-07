[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / shouldRefreshStateSandboxHandle

# Function: shouldRefreshStateSandboxHandle()

> **shouldRefreshStateSandboxHandle**(`handle`, `now`, `refreshWindowMs?`): `boolean`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:640](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/state-sandbox.ts#L640)

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
