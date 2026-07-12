[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxSessionLike

# Interface: StateSandboxSessionLike

Defined in: [packages/agent-sdk/src/state-sandbox.ts:278](https://github.com/zocomputer/zov2-code/blob/6c8f0491294917993809515b241a9263669c5f1d/packages/agent-sdk/src/state-sandbox.ts#L278)

The low-level sandbox session interface that exec/spawn and file I/O operations run over.
Implemented by SSH-backed or mock sandbox sessions.

## Methods

### dispose()?

> `optional` **dispose**(): `void` \| `PromiseLike`\<`void`\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:309](https://github.com/zocomputer/zov2-code/blob/6c8f0491294917993809515b241a9263669c5f1d/packages/agent-sdk/src/state-sandbox.ts#L309)

Cleans up the session, closing any open connections.

#### Returns

`void` \| `PromiseLike`\<`void`\>

***

### readBinaryFile()

> **readBinaryFile**(`options`): `PromiseLike`\<`Uint8Array`\<`ArrayBufferLike`\> \| `null`\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:294](https://github.com/zocomputer/zov2-code/blob/6c8f0491294917993809515b241a9263669c5f1d/packages/agent-sdk/src/state-sandbox.ts#L294)

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

Defined in: [packages/agent-sdk/src/state-sandbox.ts:303](https://github.com/zocomputer/zov2-code/blob/6c8f0491294917993809515b241a9263669c5f1d/packages/agent-sdk/src/state-sandbox.ts#L303)

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

Defined in: [packages/agent-sdk/src/state-sandbox.ts:280](https://github.com/zocomputer/zov2-code/blob/6c8f0491294917993809515b241a9263669c5f1d/packages/agent-sdk/src/state-sandbox.ts#L280)

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

Defined in: [packages/agent-sdk/src/state-sandbox.ts:287](https://github.com/zocomputer/zov2-code/blob/6c8f0491294917993809515b241a9263669c5f1d/packages/agent-sdk/src/state-sandbox.ts#L287)

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

Defined in: [packages/agent-sdk/src/state-sandbox.ts:298](https://github.com/zocomputer/zov2-code/blob/6c8f0491294917993809515b241a9263669c5f1d/packages/agent-sdk/src/state-sandbox.ts#L298)

Writes a file as binary, creating parent directories if needed.

#### Parameters

##### options

###### content

`Uint8Array`

###### path

`string`

#### Returns

`PromiseLike`\<`void`\>
