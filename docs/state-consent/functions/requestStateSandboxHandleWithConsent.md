[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-consent](../README.md) / requestStateSandboxHandleWithConsent

# Function: requestStateSandboxHandleWithConsent()

> **requestStateSandboxHandleWithConsent**(`options`): `Promise`\<[`StateHandleOutcome`](../type-aliases/StateHandleOutcome.md)\<[`StateSandboxHandle`](../../state-sandbox/interfaces/StateSandboxHandle.md)\>\>

Defined in: [packages/agent-sdk/src/state-consent-wrapper.ts:74](https://github.com/zocomputer/zov2-code/blob/8718aaa2765d9af21ff0cbb162dec35286dbcb11/packages/agent-sdk/src/state-consent-wrapper.ts#L74)

Request a state-SANDBOX handle, turning a `consent_required` gate into a steer. Same contract as the files variant.

## Parameters

### options

[`RequestStateSandboxHandleOptions`](../../state-sandbox/interfaces/RequestStateSandboxHandleOptions.md)

## Returns

`Promise`\<[`StateHandleOutcome`](../type-aliases/StateHandleOutcome.md)\<[`StateSandboxHandle`](../../state-sandbox/interfaces/StateSandboxHandle.md)\>\>
