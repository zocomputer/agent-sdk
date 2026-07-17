[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxSessionLike

# Interface: StateSandboxSessionLike

Defined in: [packages/agent-sdk/src/state-sandbox.ts:288](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/state-sandbox.ts#L288)

The low-level sandbox session interface that exec/spawn and file I/O operations run over.
Implemented by SSH-backed or mock sandbox sessions.

## Methods

### dispose()?

> `optional` **dispose**(): `void` \| `PromiseLike`\<`void`\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:319](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/state-sandbox.ts#L319)

Cleans up the session, closing any open connections.

#### Returns

`void` \| `PromiseLike`\<`void`\>

***

### readBinaryFile()

> **readBinaryFile**(`options`): `PromiseLike`\<`Uint8Array`\<`ArrayBufferLike`\> \| `null`\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:304](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/state-sandbox.ts#L304)

Reads a file as binary. Returns `null` if the file does not exist.

#### Parameters

##### options

###### path

`string`

#### Returns

`PromiseLike`\<`Uint8Array`\<`ArrayBufferLike`\> \| `null`\>

***

### removePath()

> **removePath**(`options`): `PromiseLike`\<`void`\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:313](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/state-sandbox.ts#L313)

Removes a file or directory.

#### Parameters

##### options

###### force?

`boolean`

###### path

`string`

###### recursive?

`boolean`

#### Returns

`PromiseLike`\<`void`\>

***

### run()

> **run**(`options`): `PromiseLike`\<[`StateSandboxRunResult`](StateSandboxRunResult.md)\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:290](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/state-sandbox.ts#L290)

Runs a shell command to completion and returns stdout, stderr, and exit code.

#### Parameters

##### options

###### abortSignal?

`AbortSignal`

###### command

`string`

###### env?

`Readonly`\<`Record`\<`string`, `string`\>\>

###### workingDirectory?

`string`

#### Returns

`PromiseLike`\<[`StateSandboxRunResult`](StateSandboxRunResult.md)\>

***

### spawn()

> **spawn**(`options`): `PromiseLike`\<[`StateSandboxSpawnedProcess`](StateSandboxSpawnedProcess.md)\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:297](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/state-sandbox.ts#L297)

Spawns a shell command and returns a handle to the running process with streaming output.

#### Parameters

##### options

###### abortSignal?

`AbortSignal`

###### command

`string`

###### env?

`Readonly`\<`Record`\<`string`, `string`\>\>

###### workingDirectory?

`string`

#### Returns

`PromiseLike`\<[`StateSandboxSpawnedProcess`](StateSandboxSpawnedProcess.md)\>

***

### writeBinaryFile()

> **writeBinaryFile**(`options`): `PromiseLike`\<`void`\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:308](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/state-sandbox.ts#L308)

Writes a file as binary, creating parent directories if needed.

#### Parameters

##### options

###### content

`Uint8Array`

###### path

`string`

#### Returns

`PromiseLike`\<`void`\>
