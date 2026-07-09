[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / StateFilesClient

# Interface: StateFilesClient

Defined in: [packages/agent-sdk/src/state-files.ts:257](https://github.com/zocomputer/zov2-code/blob/2c62d8b884523ef65360fa00bdaffe3cdda99189/packages/agent-sdk/src/state-files.ts#L257)

High-level client for state-files operations. Paths are relative; handles are managed internally.

## Methods

### delete()

> **delete**(`path`): `Promise`\<`void`\>

Defined in: [packages/agent-sdk/src/state-files.ts:265](https://github.com/zocomputer/zov2-code/blob/2c62d8b884523ef65360fa00bdaffe3cdda99189/packages/agent-sdk/src/state-files.ts#L265)

Deletes a file. Requires a handle with `rw` access.

#### Parameters

##### path

`string`

#### Returns

`Promise`\<`void`\>

***

### list()

> **list**(`prefix?`): `Promise`\<readonly [`StateFilesObject`](StateFilesObject.md)[]\>

Defined in: [packages/agent-sdk/src/state-files.ts:259](https://github.com/zocomputer/zov2-code/blob/2c62d8b884523ef65360fa00bdaffe3cdda99189/packages/agent-sdk/src/state-files.ts#L259)

Lists files under the optional prefix. Returns metadata for each match.

#### Parameters

##### prefix?

`string`

#### Returns

`Promise`\<readonly [`StateFilesObject`](StateFilesObject.md)[]\>

***

### read()

> **read**(`path`): `Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Defined in: [packages/agent-sdk/src/state-files.ts:261](https://github.com/zocomputer/zov2-code/blob/2c62d8b884523ef65360fa00bdaffe3cdda99189/packages/agent-sdk/src/state-files.ts#L261)

Reads a file's body as bytes.

#### Parameters

##### path

`string`

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

***

### write()

> **write**(`path`, `body`, `options?`): `Promise`\<`void`\>

Defined in: [packages/agent-sdk/src/state-files.ts:263](https://github.com/zocomputer/zov2-code/blob/2c62d8b884523ef65360fa00bdaffe3cdda99189/packages/agent-sdk/src/state-files.ts#L263)

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
