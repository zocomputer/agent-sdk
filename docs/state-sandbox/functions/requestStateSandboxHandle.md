[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / requestStateSandboxHandle

# Function: requestStateSandboxHandle()

> **requestStateSandboxHandle**(`options`): `Promise`\<[`StateSandboxHandle`](../interfaces/StateSandboxHandle.md)\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:140](https://github.com/zocomputer/zov2-code/blob/27ad75132e5ee857792f30c55f5617b1fdae5408/packages/agent-sdk/src/state-sandbox.ts#L140)

Requests a state sandbox handle from the runtime broker.
Throws `StateSandboxHandleError` if the request fails or the response is malformed.

## Parameters

### options

[`RequestStateSandboxHandleOptions`](../interfaces/RequestStateSandboxHandleOptions.md)

## Returns

`Promise`\<[`StateSandboxHandle`](../interfaces/StateSandboxHandle.md)\>
