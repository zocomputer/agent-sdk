[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxFilesClient

# Interface: StateSandboxFilesClient

Defined in: [packages/agent-sdk/src/state-sandbox.ts:334](https://github.com/zocomputer/zov2-code/blob/3717bd4ab29bacfe3ae9a5e05df2947880cbf6c9/packages/agent-sdk/src/state-sandbox.ts#L334)

High-level file I/O client for a state sandbox.
Paths are relative to the sandbox's root; the client resolves them automatically.

## Methods

### delete()

> **delete**(`path`, `options?`): `Promise`\<`void`\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:340](https://github.com/zocomputer/zov2-code/blob/3717bd4ab29bacfe3ae9a5e05df2947880cbf6c9/packages/agent-sdk/src/state-sandbox.ts#L340)

Deletes a file or directory.

#### Parameters

##### path

`string`

##### options?

###### force?

`boolean`

###### recursive?

`boolean`

#### Returns

`Promise`\<`void`\>

***

### read()

> **read**(`path`): `Promise`\<`Uint8Array`\<`ArrayBufferLike`\> \| `null`\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:336](https://github.com/zocomputer/zov2-code/blob/3717bd4ab29bacfe3ae9a5e05df2947880cbf6c9/packages/agent-sdk/src/state-sandbox.ts#L336)

Reads a file as binary. Returns `null` if the file does not exist.

#### Parameters

##### path

`string`

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\> \| `null`\>

***

### write()

> **write**(`path`, `content`): `Promise`\<`void`\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:338](https://github.com/zocomputer/zov2-code/blob/3717bd4ab29bacfe3ae9a5e05df2947880cbf6c9/packages/agent-sdk/src/state-sandbox.ts#L338)

Writes a file from a UTF-8 string or binary content, creating parent directories if needed.

#### Parameters

##### path

`string`

##### content

`string` \| `Uint8Array`\<`ArrayBufferLike`\>

#### Returns

`Promise`\<`void`\>
