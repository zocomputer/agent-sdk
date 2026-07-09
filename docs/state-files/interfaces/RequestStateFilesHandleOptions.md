[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / RequestStateFilesHandleOptions

# Interface: RequestStateFilesHandleOptions

Defined in: [packages/agent-sdk/src/state-files.ts:74](https://github.com/zocomputer/zov2-code/blob/09e5498b7ca8b96ad6bf74ed9ca9414f7ea0fd66/packages/agent-sdk/src/state-files.ts#L74)

Options for requesting a state-files handle from the runtime broker.

## Properties

### access

> `readonly` **access**: [`StateFilesAccess`](../type-aliases/StateFilesAccess.md)

Defined in: [packages/agent-sdk/src/state-files.ts:78](https://github.com/zocomputer/zov2-code/blob/09e5498b7ca8b96ad6bf74ed9ca9414f7ea0fd66/packages/agent-sdk/src/state-files.ts#L78)

***

### agentToken?

> `readonly` `optional` **agentToken?**: `string`

Defined in: [packages/agent-sdk/src/state-files.ts:80](https://github.com/zocomputer/zov2-code/blob/09e5498b7ca8b96ad6bf74ed9ca9414f7ea0fd66/packages/agent-sdk/src/state-files.ts#L80)

Agent bearer token sent to the runtime broker as `x-zo-agent-token`.

***

### apiBaseUrl

> `readonly` **apiBaseUrl**: `string` \| `URL`

Defined in: [packages/agent-sdk/src/state-files.ts:76](https://github.com/zocomputer/zov2-code/blob/09e5498b7ca8b96ad6bf74ed9ca9414f7ea0fd66/packages/agent-sdk/src/state-files.ts#L76)

***

### declarationName

> `readonly` **declarationName**: `string`

Defined in: [packages/agent-sdk/src/state-files.ts:77](https://github.com/zocomputer/zov2-code/blob/09e5498b7ca8b96ad6bf74ed9ca9414f7ea0fd66/packages/agent-sdk/src/state-files.ts#L77)

***

### eveSessionKey?

> `readonly` `optional` **eveSessionKey?**: `string`

Defined in: [packages/agent-sdk/src/state-files.ts:82](https://github.com/zocomputer/zov2-code/blob/09e5498b7ca8b96ad6bf74ed9ca9414f7ea0fd66/packages/agent-sdk/src/state-files.ts#L82)

eve session key sent as `x-zo-eve-session`; the route derives resolver session identity from auth context.

***

### fetch

> `readonly` **fetch**: [`StateFilesHandleFetch`](StateFilesHandleFetch.md)

Defined in: [packages/agent-sdk/src/state-files.ts:75](https://github.com/zocomputer/zov2-code/blob/09e5498b7ca8b96ad6bf74ed9ca9414f7ea0fd66/packages/agent-sdk/src/state-files.ts#L75)

***

### headers?

> `readonly` `optional` **headers?**: [`StateFilesHeadersInit`](../type-aliases/StateFilesHeadersInit.md)

Defined in: [packages/agent-sdk/src/state-files.ts:84](https://github.com/zocomputer/zov2-code/blob/09e5498b7ca8b96ad6bf74ed9ca9414f7ea0fd66/packages/agent-sdk/src/state-files.ts#L84)

Extra headers; cannot override the SDK-managed content type or Zo auth headers.
