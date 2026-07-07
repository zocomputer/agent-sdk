[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / requestStateSandboxHandle

# Function: requestStateSandboxHandle()

> **requestStateSandboxHandle**(`options`): `Promise`\<[`StateSandboxHandle`](../interfaces/StateSandboxHandle.md)\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:140](https://github.com/zocomputer/zov2-code/blob/ea621634e36cbd869fece8585e35d7f842c47a15/packages/agent-sdk/src/state-sandbox.ts#L140)

Requests a state sandbox handle from the runtime broker.
Throws `StateSandboxHandleError` if the request fails or the response is malformed.

## Parameters

### options

[`RequestStateSandboxHandleOptions`](../interfaces/RequestStateSandboxHandleOptions.md)

## Returns

`Promise`\<[`StateSandboxHandle`](../interfaces/StateSandboxHandle.md)\>
