[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / requestStateSandboxHandle

# Function: requestStateSandboxHandle()

> **requestStateSandboxHandle**(`options`): `Promise`\<[`StateSandboxHandle`](../interfaces/StateSandboxHandle.md)\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:152](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/state-sandbox.ts#L152)

Requests a state sandbox handle from the runtime broker.
Throws `StateSandboxHandleError` if the request fails or the response is malformed.

## Parameters

### options

[`RequestStateSandboxHandleOptions`](../interfaces/RequestStateSandboxHandleOptions.md)

## Returns

`Promise`\<[`StateSandboxHandle`](../interfaces/StateSandboxHandle.md)\>
