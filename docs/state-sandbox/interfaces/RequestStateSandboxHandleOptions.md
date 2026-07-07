[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / RequestStateSandboxHandleOptions

# Interface: RequestStateSandboxHandleOptions

Defined in: [packages/agent-sdk/src/state-sandbox.ts:97](https://github.com/zocomputer/zov2-code/blob/ea2754383255c8c5c02ffe9d50fe4b5dbea37395/packages/agent-sdk/src/state-sandbox.ts#L97)

Options for requesting a state sandbox handle from the runtime broker.
Specifies the HTTP client, API base URL, state declaration details, and optional auth credentials.

## Properties

### access

> `readonly` **access**: [`StateSandboxAccess`](../type-aliases/StateSandboxAccess.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:102](https://github.com/zocomputer/zov2-code/blob/ea2754383255c8c5c02ffe9d50fe4b5dbea37395/packages/agent-sdk/src/state-sandbox.ts#L102)

***

### agentToken?

> `readonly` `optional` **agentToken?**: `string`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:104](https://github.com/zocomputer/zov2-code/blob/ea2754383255c8c5c02ffe9d50fe4b5dbea37395/packages/agent-sdk/src/state-sandbox.ts#L104)

Agent bearer token sent to the runtime broker as `x-zo-agent-token`.

***

### apiBaseUrl

> `readonly` **apiBaseUrl**: `string` \| `URL`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:99](https://github.com/zocomputer/zov2-code/blob/ea2754383255c8c5c02ffe9d50fe4b5dbea37395/packages/agent-sdk/src/state-sandbox.ts#L99)

***

### declarationName

> `readonly` **declarationName**: `string`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:100](https://github.com/zocomputer/zov2-code/blob/ea2754383255c8c5c02ffe9d50fe4b5dbea37395/packages/agent-sdk/src/state-sandbox.ts#L100)

***

### eveSessionKey?

> `readonly` `optional` **eveSessionKey?**: `string`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:106](https://github.com/zocomputer/zov2-code/blob/ea2754383255c8c5c02ffe9d50fe4b5dbea37395/packages/agent-sdk/src/state-sandbox.ts#L106)

eve session key sent as `x-zo-eve-session`; the route derives resolver session identity from auth context.

***

### fetch

> `readonly` **fetch**: [`StateSandboxHandleFetch`](StateSandboxHandleFetch.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:98](https://github.com/zocomputer/zov2-code/blob/ea2754383255c8c5c02ffe9d50fe4b5dbea37395/packages/agent-sdk/src/state-sandbox.ts#L98)

***

### headers?

> `readonly` `optional` **headers?**: [`StateSandboxHeadersInit`](../type-aliases/StateSandboxHeadersInit.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:114](https://github.com/zocomputer/zov2-code/blob/ea2754383255c8c5c02ffe9d50fe4b5dbea37395/packages/agent-sdk/src/state-sandbox.ts#L114)

Extra headers; cannot override the SDK-managed content type or Zo auth headers.

***

### interface

> `readonly` **interface**: [`StateSandboxInterface`](../type-aliases/StateSandboxInterface.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:101](https://github.com/zocomputer/zov2-code/blob/ea2754383255c8c5c02ffe9d50fe4b5dbea37395/packages/agent-sdk/src/state-sandbox.ts#L101)

***

### suggestedDefaults?

> `readonly` `optional` **suggestedDefaults?**: [`StateSandboxSuggestedDefaults`](StateSandboxSuggestedDefaults.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:112](https://github.com/zocomputer/zov2-code/blob/ea2754383255c8c5c02ffe9d50fe4b5dbea37395/packages/agent-sdk/src/state-sandbox.ts#L112)

Declaration defaults from `defineExternalState`. The sandbox client sends
`engine: "sandbox-daytona"` by default so unbound exec declarations do
not fall through to the broker's R2 zero-config default.
