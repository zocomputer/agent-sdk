[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / RequestStateSandboxHandleOptions

# Interface: RequestStateSandboxHandleOptions

Defined in: [packages/agent-sdk/src/state-sandbox.ts:106](https://github.com/zocomputer/zov2-code/blob/9a2687559528851e1e25b6b64341058d2d74e9dc/packages/agent-sdk/src/state-sandbox.ts#L106)

Options for requesting a state sandbox handle from the runtime broker.
Specifies the HTTP client, API base URL, state declaration details, and optional auth credentials.

## Properties

### access

> `readonly` **access**: [`StateSandboxAccess`](../type-aliases/StateSandboxAccess.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:111](https://github.com/zocomputer/zov2-code/blob/9a2687559528851e1e25b6b64341058d2d74e9dc/packages/agent-sdk/src/state-sandbox.ts#L111)

***

### agentToken?

> `readonly` `optional` **agentToken?**: `string`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:113](https://github.com/zocomputer/zov2-code/blob/9a2687559528851e1e25b6b64341058d2d74e9dc/packages/agent-sdk/src/state-sandbox.ts#L113)

Agent bearer token sent to the runtime broker as `x-zo-agent-token`.

***

### apiBaseUrl

> `readonly` **apiBaseUrl**: `string` \| `URL`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:108](https://github.com/zocomputer/zov2-code/blob/9a2687559528851e1e25b6b64341058d2d74e9dc/packages/agent-sdk/src/state-sandbox.ts#L108)

***

### declarationName

> `readonly` **declarationName**: `string`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:109](https://github.com/zocomputer/zov2-code/blob/9a2687559528851e1e25b6b64341058d2d74e9dc/packages/agent-sdk/src/state-sandbox.ts#L109)

***

### eveSessionKey?

> `readonly` `optional` **eveSessionKey?**: `string`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:115](https://github.com/zocomputer/zov2-code/blob/9a2687559528851e1e25b6b64341058d2d74e9dc/packages/agent-sdk/src/state-sandbox.ts#L115)

eve session key sent as `x-zo-eve-session`; the route derives resolver session identity from auth context.

***

### fetch

> `readonly` **fetch**: [`StateSandboxHandleFetch`](StateSandboxHandleFetch.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:107](https://github.com/zocomputer/zov2-code/blob/9a2687559528851e1e25b6b64341058d2d74e9dc/packages/agent-sdk/src/state-sandbox.ts#L107)

***

### headers?

> `readonly` `optional` **headers?**: [`StateSandboxHeadersInit`](../type-aliases/StateSandboxHeadersInit.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:125](https://github.com/zocomputer/zov2-code/blob/9a2687559528851e1e25b6b64341058d2d74e9dc/packages/agent-sdk/src/state-sandbox.ts#L125)

Extra headers; cannot override the SDK-managed content type or Zo auth headers.

***

### interface

> `readonly` **interface**: [`StateSandboxInterface`](../type-aliases/StateSandboxInterface.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:110](https://github.com/zocomputer/zov2-code/blob/9a2687559528851e1e25b6b64341058d2d74e9dc/packages/agent-sdk/src/state-sandbox.ts#L110)

***

### sessionCapability?

> `readonly` `optional` **sessionCapability?**: `string`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:117](https://github.com/zocomputer/zov2-code/blob/9a2687559528851e1e25b6b64341058d2d74e9dc/packages/agent-sdk/src/state-sandbox.ts#L117)

Opaque trusted-channel capability sent as `x-zo-session-capability`.

***

### suggestedDefaults?

> `readonly` `optional` **suggestedDefaults?**: [`StateSandboxSuggestedDefaults`](StateSandboxSuggestedDefaults.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:123](https://github.com/zocomputer/zov2-code/blob/9a2687559528851e1e25b6b64341058d2d74e9dc/packages/agent-sdk/src/state-sandbox.ts#L123)

Declaration defaults from `defineExternalState`. The sandbox client sends
`engine: "sandbox-daytona"` by default so unbound exec declarations do
not fall through to the broker's R2 zero-config default.
