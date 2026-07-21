[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxFilesClient

# Interface: StateSandboxFilesClient

Defined in: [packages/agent-sdk/src/state-sandbox.ts:360](https://github.com/zocomputer/zov2-code/blob/4b68538420ff1392c629a63ef43ccfd25f463014/packages/agent-sdk/src/state-sandbox.ts#L360)

High-level file I/O client for a state sandbox.
Paths are relative to the sandbox's root; the client resolves them automatically.

## Methods

### delete()

> **delete**(`path`, `options?`): `Promise`\<`void`\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:366](https://github.com/zocomputer/zov2-code/blob/4b68538420ff1392c629a63ef43ccfd25f463014/packages/agent-sdk/src/state-sandbox.ts#L366)

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

Defined in: [packages/agent-sdk/src/state-sandbox.ts:362](https://github.com/zocomputer/zov2-code/blob/4b68538420ff1392c629a63ef43ccfd25f463014/packages/agent-sdk/src/state-sandbox.ts#L362)

Reads a file as binary. Returns `null` if the file does not exist.

#### Parameters

##### path

`string`

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\> \| `null`\>

***

### write()

> **write**(`path`, `content`): `Promise`\<`void`\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:364](https://github.com/zocomputer/zov2-code/blob/4b68538420ff1392c629a63ef43ccfd25f463014/packages/agent-sdk/src/state-sandbox.ts#L364)

Writes a file from a UTF-8 string or binary content, creating parent directories if needed.

#### Parameters

##### path

`string`

##### content

`string` \| `Uint8Array`\<`ArrayBufferLike`\>

#### Returns

`Promise`\<`void`\>
