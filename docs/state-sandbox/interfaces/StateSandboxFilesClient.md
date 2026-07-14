[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxFilesClient

# Interface: StateSandboxFilesClient

Defined in: [packages/agent-sdk/src/state-sandbox.ts:324](https://github.com/zocomputer/zov2-code/blob/e7fb39c35601ce5ee40494fbfe469df1f7a9ecc4/packages/agent-sdk/src/state-sandbox.ts#L324)

High-level file I/O client for a state sandbox.
Paths are relative to the sandbox's root; the client resolves them automatically.

## Methods

### delete()

> **delete**(`path`, `options?`): `Promise`\<`void`\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:330](https://github.com/zocomputer/zov2-code/blob/e7fb39c35601ce5ee40494fbfe469df1f7a9ecc4/packages/agent-sdk/src/state-sandbox.ts#L330)

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

Defined in: [packages/agent-sdk/src/state-sandbox.ts:326](https://github.com/zocomputer/zov2-code/blob/e7fb39c35601ce5ee40494fbfe469df1f7a9ecc4/packages/agent-sdk/src/state-sandbox.ts#L326)

Reads a file as binary. Returns `null` if the file does not exist.

#### Parameters

##### path

`string`

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\> \| `null`\>

***

### write()

> **write**(`path`, `content`): `Promise`\<`void`\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:328](https://github.com/zocomputer/zov2-code/blob/e7fb39c35601ce5ee40494fbfe469df1f7a9ecc4/packages/agent-sdk/src/state-sandbox.ts#L328)

Writes a file from a UTF-8 string or binary content, creating parent directories if needed.

#### Parameters

##### path

`string`

##### content

`string` \| `Uint8Array`\<`ArrayBufferLike`\>

#### Returns

`Promise`\<`void`\>
