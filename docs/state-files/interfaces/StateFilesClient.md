[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / StateFilesClient

# Interface: StateFilesClient

Defined in: [packages/agent-sdk/src/state-files.ts:262](https://github.com/zocomputer/zov2-code/blob/9d3f4b0b6ac2b9a8a8d1307a4590af07d0d7978f/packages/agent-sdk/src/state-files.ts#L262)

High-level client for state-files operations. Paths are relative; handles are managed internally.

## Methods

### delete()

> **delete**(`path`): `Promise`\<`void`\>

Defined in: [packages/agent-sdk/src/state-files.ts:270](https://github.com/zocomputer/zov2-code/blob/9d3f4b0b6ac2b9a8a8d1307a4590af07d0d7978f/packages/agent-sdk/src/state-files.ts#L270)

Deletes a file. Requires a handle with `rw` access.

#### Parameters

##### path

`string`

#### Returns

`Promise`\<`void`\>

***

### list()

> **list**(`prefix?`): `Promise`\<readonly [`StateFilesObject`](StateFilesObject.md)[]\>

Defined in: [packages/agent-sdk/src/state-files.ts:264](https://github.com/zocomputer/zov2-code/blob/9d3f4b0b6ac2b9a8a8d1307a4590af07d0d7978f/packages/agent-sdk/src/state-files.ts#L264)

Lists files under the optional prefix. Returns metadata for each match.

#### Parameters

##### prefix?

`string`

#### Returns

`Promise`\<readonly [`StateFilesObject`](StateFilesObject.md)[]\>

***

### read()

> **read**(`path`): `Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Defined in: [packages/agent-sdk/src/state-files.ts:266](https://github.com/zocomputer/zov2-code/blob/9d3f4b0b6ac2b9a8a8d1307a4590af07d0d7978f/packages/agent-sdk/src/state-files.ts#L266)

Reads a file's body as bytes.

#### Parameters

##### path

`string`

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

***

### write()

> **write**(`path`, `body`, `options?`): `Promise`\<`void`\>

Defined in: [packages/agent-sdk/src/state-files.ts:268](https://github.com/zocomputer/zov2-code/blob/9d3f4b0b6ac2b9a8a8d1307a4590af07d0d7978f/packages/agent-sdk/src/state-files.ts#L268)

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
