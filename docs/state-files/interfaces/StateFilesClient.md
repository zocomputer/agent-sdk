[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / StateFilesClient

# Interface: StateFilesClient

Defined in: [packages/agent-sdk/src/state-files.ts:239](https://github.com/zocomputer/zov2-code/blob/94be7c286c5c8961c9d40350c41cf663e8ab4554/packages/agent-sdk/src/state-files.ts#L239)

High-level client for state-files operations. Paths are relative; handles are managed internally.

## Methods

### delete()

> **delete**(`path`): `Promise`\<`void`\>

Defined in: [packages/agent-sdk/src/state-files.ts:247](https://github.com/zocomputer/zov2-code/blob/94be7c286c5c8961c9d40350c41cf663e8ab4554/packages/agent-sdk/src/state-files.ts#L247)

Deletes a file. Requires a handle with `rw` access.

#### Parameters

##### path

`string`

#### Returns

`Promise`\<`void`\>

***

### list()

> **list**(`prefix?`): `Promise`\<readonly [`StateFilesObject`](StateFilesObject.md)[]\>

Defined in: [packages/agent-sdk/src/state-files.ts:241](https://github.com/zocomputer/zov2-code/blob/94be7c286c5c8961c9d40350c41cf663e8ab4554/packages/agent-sdk/src/state-files.ts#L241)

Lists files under the optional prefix. Returns metadata for each match.

#### Parameters

##### prefix?

`string`

#### Returns

`Promise`\<readonly [`StateFilesObject`](StateFilesObject.md)[]\>

***

### read()

> **read**(`path`): `Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Defined in: [packages/agent-sdk/src/state-files.ts:243](https://github.com/zocomputer/zov2-code/blob/94be7c286c5c8961c9d40350c41cf663e8ab4554/packages/agent-sdk/src/state-files.ts#L243)

Reads a file's body as bytes.

#### Parameters

##### path

`string`

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

***

### write()

> **write**(`path`, `body`, `options?`): `Promise`\<`void`\>

Defined in: [packages/agent-sdk/src/state-files.ts:245](https://github.com/zocomputer/zov2-code/blob/94be7c286c5c8961c9d40350c41cf663e8ab4554/packages/agent-sdk/src/state-files.ts#L245)

Writes a file. Requires a handle with `rw` access.

#### Parameters

##### path

`string`

##### body

[`StateFilesBody`](../type-aliases/StateFilesBody.md)

##### options?

[`StateFilesWriteOptions`](StateFilesWriteOptions.md)

#### Returns

`Promise`\<`void`\>
