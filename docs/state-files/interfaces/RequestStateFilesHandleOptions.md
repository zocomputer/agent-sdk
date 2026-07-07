[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / RequestStateFilesHandleOptions

# Interface: RequestStateFilesHandleOptions

Defined in: [packages/agent-sdk/src/state-files.ts:71](https://github.com/zocomputer/zov2-code/blob/ad31c397882c72b933077cb2108bebb0430d6e9d/packages/agent-sdk/src/state-files.ts#L71)

Options for requesting a state-files handle from the runtime broker.

## Properties

### access

> `readonly` **access**: [`StateFilesAccess`](../type-aliases/StateFilesAccess.md)

Defined in: [packages/agent-sdk/src/state-files.ts:75](https://github.com/zocomputer/zov2-code/blob/ad31c397882c72b933077cb2108bebb0430d6e9d/packages/agent-sdk/src/state-files.ts#L75)

***

### agentToken?

> `readonly` `optional` **agentToken?**: `string`

Defined in: [packages/agent-sdk/src/state-files.ts:77](https://github.com/zocomputer/zov2-code/blob/ad31c397882c72b933077cb2108bebb0430d6e9d/packages/agent-sdk/src/state-files.ts#L77)

Agent bearer token sent to the runtime broker as `x-zo-agent-token`.

***

### apiBaseUrl

> `readonly` **apiBaseUrl**: `string` \| `URL`

Defined in: [packages/agent-sdk/src/state-files.ts:73](https://github.com/zocomputer/zov2-code/blob/ad31c397882c72b933077cb2108bebb0430d6e9d/packages/agent-sdk/src/state-files.ts#L73)

***

### declarationName

> `readonly` **declarationName**: `string`

Defined in: [packages/agent-sdk/src/state-files.ts:74](https://github.com/zocomputer/zov2-code/blob/ad31c397882c72b933077cb2108bebb0430d6e9d/packages/agent-sdk/src/state-files.ts#L74)

***

### eveSessionKey?

> `readonly` `optional` **eveSessionKey?**: `string`

Defined in: [packages/agent-sdk/src/state-files.ts:79](https://github.com/zocomputer/zov2-code/blob/ad31c397882c72b933077cb2108bebb0430d6e9d/packages/agent-sdk/src/state-files.ts#L79)

eve session key sent as `x-zo-eve-session`; the route derives resolver session identity from auth context.

***

### fetch

> `readonly` **fetch**: [`StateFilesHandleFetch`](StateFilesHandleFetch.md)

Defined in: [packages/agent-sdk/src/state-files.ts:72](https://github.com/zocomputer/zov2-code/blob/ad31c397882c72b933077cb2108bebb0430d6e9d/packages/agent-sdk/src/state-files.ts#L72)

***

### headers?

> `readonly` `optional` **headers?**: [`StateFilesHeadersInit`](../type-aliases/StateFilesHeadersInit.md)

Defined in: [packages/agent-sdk/src/state-files.ts:81](https://github.com/zocomputer/zov2-code/blob/ad31c397882c72b933077cb2108bebb0430d6e9d/packages/agent-sdk/src/state-files.ts#L81)

Extra headers; cannot override the SDK-managed content type or Zo auth headers.
