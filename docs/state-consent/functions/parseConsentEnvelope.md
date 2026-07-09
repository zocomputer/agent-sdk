[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-consent](../README.md) / parseConsentEnvelope

# Function: parseConsentEnvelope()

> **parseConsentEnvelope**(`value`): \{ `bindingId`: `string`; `declarationName`: `string`; `party`: \{ `external`: `boolean`; `handle`: `string`; `intentDivergenceNote?`: `string`; \}; `resourceName`: `string`; \} \| `null`

Defined in: [packages/agent-sdk/src/state-consent-envelope.ts:54](https://github.com/zocomputer/zov2-code/blob/a259f6f3d345009ac90c86d9f10d9171b99736b9/packages/agent-sdk/src/state-consent-envelope.ts#L54)

Parse an untrusted value (a broker 409 body's consent fields) into a typed
envelope, or `null` if malformed — parse-don't-validate at the wire boundary,
the same contract chat-core's `parseConsentToolInput` enforces client-side.

## Parameters

### value

`unknown`

## Returns

\{ `bindingId`: `string`; `declarationName`: `string`; `party`: \{ `external`: `boolean`; `handle`: `string`; `intentDivergenceNote?`: `string`; \}; `resourceName`: `string`; \} \| `null`
