[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / RequestStateSandboxHandleOptions

# Interface: RequestStateSandboxHandleOptions

Defined in: [packages/agent-sdk/src/state-sandbox.ts:98](https://github.com/zocomputer/zov2-code/blob/63d0e014c421616ce0383b99e59109da774eac14/packages/agent-sdk/src/state-sandbox.ts#L98)

Options for requesting a state sandbox handle from the runtime broker.
Specifies the HTTP client, API base URL, state declaration details, and optional auth credentials.

## Properties

### access

> `readonly` **access**: [`StateSandboxAccess`](../type-aliases/StateSandboxAccess.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:103](https://github.com/zocomputer/zov2-code/blob/63d0e014c421616ce0383b99e59109da774eac14/packages/agent-sdk/src/state-sandbox.ts#L103)

***

### agentToken?

> `readonly` `optional` **agentToken?**: `string`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:105](https://github.com/zocomputer/zov2-code/blob/63d0e014c421616ce0383b99e59109da774eac14/packages/agent-sdk/src/state-sandbox.ts#L105)

Agent bearer token sent to the runtime broker as `x-zo-agent-token`.

***

### apiBaseUrl

> `readonly` **apiBaseUrl**: `string` \| `URL`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:100](https://github.com/zocomputer/zov2-code/blob/63d0e014c421616ce0383b99e59109da774eac14/packages/agent-sdk/src/state-sandbox.ts#L100)

***

### declarationName

> `readonly` **declarationName**: `string`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:101](https://github.com/zocomputer/zov2-code/blob/63d0e014c421616ce0383b99e59109da774eac14/packages/agent-sdk/src/state-sandbox.ts#L101)

***

### eveSessionKey?

> `readonly` `optional` **eveSessionKey?**: `string`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:107](https://github.com/zocomputer/zov2-code/blob/63d0e014c421616ce0383b99e59109da774eac14/packages/agent-sdk/src/state-sandbox.ts#L107)

eve session key sent as `x-zo-eve-session`; the route derives resolver session identity from auth context.

***

### fetch

> `readonly` **fetch**: [`StateSandboxHandleFetch`](StateSandboxHandleFetch.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:99](https://github.com/zocomputer/zov2-code/blob/63d0e014c421616ce0383b99e59109da774eac14/packages/agent-sdk/src/state-sandbox.ts#L99)

***

### headers?

> `readonly` `optional` **headers?**: [`StateSandboxHeadersInit`](../type-aliases/StateSandboxHeadersInit.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:115](https://github.com/zocomputer/zov2-code/blob/63d0e014c421616ce0383b99e59109da774eac14/packages/agent-sdk/src/state-sandbox.ts#L115)

Extra headers; cannot override the SDK-managed content type or Zo auth headers.

***

### interface

> `readonly` **interface**: [`StateSandboxInterface`](../type-aliases/StateSandboxInterface.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:102](https://github.com/zocomputer/zov2-code/blob/63d0e014c421616ce0383b99e59109da774eac14/packages/agent-sdk/src/state-sandbox.ts#L102)

***

### suggestedDefaults?

> `readonly` `optional` **suggestedDefaults?**: [`StateSandboxSuggestedDefaults`](StateSandboxSuggestedDefaults.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:113](https://github.com/zocomputer/zov2-code/blob/63d0e014c421616ce0383b99e59109da774eac14/packages/agent-sdk/src/state-sandbox.ts#L113)

Declaration defaults from `defineExternalState`. The sandbox client sends
`engine: "sandbox-daytona"` by default so unbound exec declarations do
not fall through to the broker's R2 zero-config default.
