[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / RequestStateFilesHandleOptions

# Interface: RequestStateFilesHandleOptions

Defined in: [packages/agent-sdk/src/state-files.ts:77](https://github.com/zocomputer/zov2-code/blob/4b68538420ff1392c629a63ef43ccfd25f463014/packages/agent-sdk/src/state-files.ts#L77)

Options for requesting a state-files handle from the runtime broker.

## Properties

### access

> `readonly` **access**: [`StateFilesAccess`](../type-aliases/StateFilesAccess.md)

Defined in: [packages/agent-sdk/src/state-files.ts:81](https://github.com/zocomputer/zov2-code/blob/4b68538420ff1392c629a63ef43ccfd25f463014/packages/agent-sdk/src/state-files.ts#L81)

***

### agentToken?

> `readonly` `optional` **agentToken?**: `string`

Defined in: [packages/agent-sdk/src/state-files.ts:83](https://github.com/zocomputer/zov2-code/blob/4b68538420ff1392c629a63ef43ccfd25f463014/packages/agent-sdk/src/state-files.ts#L83)

Agent bearer token sent to the runtime broker as `x-zo-agent-token`.

***

### apiBaseUrl

> `readonly` **apiBaseUrl**: `string` \| `URL`

Defined in: [packages/agent-sdk/src/state-files.ts:79](https://github.com/zocomputer/zov2-code/blob/4b68538420ff1392c629a63ef43ccfd25f463014/packages/agent-sdk/src/state-files.ts#L79)

***

### declarationName

> `readonly` **declarationName**: `string`

Defined in: [packages/agent-sdk/src/state-files.ts:80](https://github.com/zocomputer/zov2-code/blob/4b68538420ff1392c629a63ef43ccfd25f463014/packages/agent-sdk/src/state-files.ts#L80)

***

### eveSessionKey?

> `readonly` `optional` **eveSessionKey?**: `string`

Defined in: [packages/agent-sdk/src/state-files.ts:85](https://github.com/zocomputer/zov2-code/blob/4b68538420ff1392c629a63ef43ccfd25f463014/packages/agent-sdk/src/state-files.ts#L85)

eve session key sent as `x-zo-eve-session`; the route derives resolver session identity from auth context.

***

### fetch

> `readonly` **fetch**: [`StateFilesHandleFetch`](StateFilesHandleFetch.md)

Defined in: [packages/agent-sdk/src/state-files.ts:78](https://github.com/zocomputer/zov2-code/blob/4b68538420ff1392c629a63ef43ccfd25f463014/packages/agent-sdk/src/state-files.ts#L78)

***

### headers?

> `readonly` `optional` **headers?**: [`StateFilesHeadersInit`](../type-aliases/StateFilesHeadersInit.md)

Defined in: [packages/agent-sdk/src/state-files.ts:89](https://github.com/zocomputer/zov2-code/blob/4b68538420ff1392c629a63ef43ccfd25f463014/packages/agent-sdk/src/state-files.ts#L89)

Extra headers; cannot override the SDK-managed content type or Zo auth headers.

***

### sessionCapability?

> `readonly` `optional` **sessionCapability?**: `string`

Defined in: [packages/agent-sdk/src/state-files.ts:87](https://github.com/zocomputer/zov2-code/blob/4b68538420ff1392c629a63ef43ccfd25f463014/packages/agent-sdk/src/state-files.ts#L87)

Opaque trusted-channel capability read from Eve session auth.
