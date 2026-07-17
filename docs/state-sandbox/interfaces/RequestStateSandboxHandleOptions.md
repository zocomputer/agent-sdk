[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / RequestStateSandboxHandleOptions

# Interface: RequestStateSandboxHandleOptions

Defined in: [packages/agent-sdk/src/state-sandbox.ts:100](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/state-sandbox.ts#L100)

Options for requesting a state sandbox handle from the runtime broker.
Specifies the HTTP client, API base URL, state declaration details, and optional auth credentials.

## Properties

### access

> `readonly` **access**: [`StateSandboxAccess`](../type-aliases/StateSandboxAccess.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:105](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/state-sandbox.ts#L105)

***

### agentToken?

> `readonly` `optional` **agentToken?**: `string`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:107](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/state-sandbox.ts#L107)

Agent bearer token sent to the runtime broker as `x-zo-agent-token`.

***

### apiBaseUrl

> `readonly` **apiBaseUrl**: `string` \| `URL`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:102](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/state-sandbox.ts#L102)

***

### declarationName

> `readonly` **declarationName**: `string`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:103](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/state-sandbox.ts#L103)

***

### eveSessionKey?

> `readonly` `optional` **eveSessionKey?**: `string`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:109](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/state-sandbox.ts#L109)

eve session key sent as `x-zo-eve-session`; the route derives resolver session identity from auth context.

***

### fetch

> `readonly` **fetch**: [`StateSandboxHandleFetch`](StateSandboxHandleFetch.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:101](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/state-sandbox.ts#L101)

***

### headers?

> `readonly` `optional` **headers?**: [`StateSandboxHeadersInit`](../type-aliases/StateSandboxHeadersInit.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:119](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/state-sandbox.ts#L119)

Extra headers; cannot override the SDK-managed content type or Zo auth headers.

***

### interface

> `readonly` **interface**: [`StateSandboxInterface`](../type-aliases/StateSandboxInterface.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:104](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/state-sandbox.ts#L104)

***

### sessionCapability?

> `readonly` `optional` **sessionCapability?**: `string`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:111](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/state-sandbox.ts#L111)

Opaque trusted-channel capability sent as `x-zo-session-capability`.

***

### suggestedDefaults?

> `readonly` `optional` **suggestedDefaults?**: [`StateSandboxSuggestedDefaults`](StateSandboxSuggestedDefaults.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:117](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/state-sandbox.ts#L117)

Declaration defaults from `defineExternalState`. The sandbox client sends
`engine: "sandbox-daytona"` by default so unbound exec declarations do
not fall through to the broker's R2 zero-config default.
