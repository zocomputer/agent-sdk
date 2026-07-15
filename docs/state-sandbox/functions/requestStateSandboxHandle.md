[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / requestStateSandboxHandle

# Function: requestStateSandboxHandle()

> **requestStateSandboxHandle**(`options`): `Promise`\<[`StateSandboxHandle`](../interfaces/StateSandboxHandle.md)\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:148](https://github.com/zocomputer/zov2-code/blob/ea094c0d7d3efd4351c48b5c1bd38d95a1836e8d/packages/agent-sdk/src/state-sandbox.ts#L148)

Requests a state sandbox handle from the runtime broker.
Throws `StateSandboxHandleError` if the request fails or the response is malformed.

## Parameters

### options

[`RequestStateSandboxHandleOptions`](../interfaces/RequestStateSandboxHandleOptions.md)

## Returns

`Promise`\<[`StateSandboxHandle`](../interfaces/StateSandboxHandle.md)\>
