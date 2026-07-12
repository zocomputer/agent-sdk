[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SandboxExecSessionLike

# Interface: SandboxExecSessionLike

Defined in: [packages/agent-sdk/src/sandbox-run.ts:55](https://github.com/zocomputer/zov2-code/blob/6c8f0491294917993809515b241a9263669c5f1d/packages/agent-sdk/src/sandbox-run.ts#L55)

A sandbox session that can spawn long-running processes — the file-tool
session slice plus `spawn`. Eve's `SandboxSession` satisfies it
structurally; `createSandboxRunner` narrows a plain `SandboxSessionLike`
to this at runtime and fails with a clear error when the backend can't
spawn.

## Extends

- [`SandboxSessionLike`](SandboxSessionLike.md)

## Properties

### readBinaryFile

> `readonly` **readBinaryFile**: (`options`) => `PromiseLike`\<`Uint8Array`\<`ArrayBufferLike`\> \| `null`\>

Defined in: [packages/agent-sdk/src/workspace-io.ts:106](https://github.com/zocomputer/zov2-code/blob/6c8f0491294917993809515b241a9263669c5f1d/packages/agent-sdk/src/workspace-io.ts#L106)

Read a file's bytes; null when it doesn't exist.

#### Parameters

##### options

###### path

`string`

#### Returns

`PromiseLike`\<`Uint8Array`\<`ArrayBufferLike`\> \| `null`\>

#### Inherited from

[`SandboxSessionLike`](SandboxSessionLike.md).[`readBinaryFile`](SandboxSessionLike.md#readbinaryfile)

***

### run

> `readonly` **run**: (`options`) => `PromiseLike`\<\{ `exitCode`: `number`; `stderr`: `string`; `stdout`: `string`; \}\>

Defined in: [packages/agent-sdk/src/workspace-io.ts:115](https://github.com/zocomputer/zov2-code/blob/6c8f0491294917993809515b241a9263669c5f1d/packages/agent-sdk/src/workspace-io.ts#L115)

Run a shell command and wait for its completion.

#### Parameters

##### options

###### command

`string`

###### workingDirectory?

`string`

#### Returns

`PromiseLike`\<\{ `exitCode`: `number`; `stderr`: `string`; `stdout`: `string`; \}\>

#### Inherited from

[`SandboxSessionLike`](SandboxSessionLike.md).[`run`](SandboxSessionLike.md#run)

***

### spawn

> `readonly` **spawn**: (`options`) => `PromiseLike`\<[`SandboxProcessLike`](SandboxProcessLike.md)\>

Defined in: [packages/agent-sdk/src/sandbox-run.ts:57](https://github.com/zocomputer/zov2-code/blob/6c8f0491294917993809515b241a9263669c5f1d/packages/agent-sdk/src/sandbox-run.ts#L57)

Spawn a shell command in the sandbox and return live process handles.

#### Parameters

##### options

###### command

`string`

###### workingDirectory?

`string`

#### Returns

`PromiseLike`\<[`SandboxProcessLike`](SandboxProcessLike.md)\>

***

### writeBinaryFile

> `readonly` **writeBinaryFile**: (`options`) => `PromiseLike`\<`void`\>

Defined in: [packages/agent-sdk/src/workspace-io.ts:110](https://github.com/zocomputer/zov2-code/blob/6c8f0491294917993809515b241a9263669c5f1d/packages/agent-sdk/src/workspace-io.ts#L110)

Write a file, creating parent directories and overwriting.

#### Parameters

##### options

###### content

`Uint8Array`

###### path

`string`

#### Returns

`PromiseLike`\<`void`\>

#### Inherited from

[`SandboxSessionLike`](SandboxSessionLike.md).[`writeBinaryFile`](SandboxSessionLike.md#writebinaryfile)
