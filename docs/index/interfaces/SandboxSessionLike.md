[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SandboxSessionLike

# Interface: SandboxSessionLike

Defined in: [packages/agent-sdk/src/workspace-io.ts:104](https://github.com/zocomputer/zov2-code/blob/3530b39a94e929be74c3d9202bace84f47b21b44/packages/agent-sdk/src/workspace-io.ts#L104)

The slice of eve's `SandboxSession` the sandbox backend needs, declared
structurally so lib modules stay framework-free (eve's type satisfies it).
Shapes mirror the AI SDK sandbox surface: reads resolve `null` for a
missing file, writes create parent directories.

## Extended by

- [`SandboxExecSessionLike`](SandboxExecSessionLike.md)

## Properties

### readBinaryFile

> `readonly` **readBinaryFile**: (`options`) => `PromiseLike`\<`Uint8Array`\<`ArrayBufferLike`\> \| `null`\>

Defined in: [packages/agent-sdk/src/workspace-io.ts:106](https://github.com/zocomputer/zov2-code/blob/3530b39a94e929be74c3d9202bace84f47b21b44/packages/agent-sdk/src/workspace-io.ts#L106)

Read a file's bytes; null when it doesn't exist.

#### Parameters

##### options

###### path

`string`

#### Returns

`PromiseLike`\<`Uint8Array`\<`ArrayBufferLike`\> \| `null`\>

***

### run

> `readonly` **run**: (`options`) => `PromiseLike`\<\{ `exitCode`: `number`; `stderr`: `string`; `stdout`: `string`; \}\>

Defined in: [packages/agent-sdk/src/workspace-io.ts:115](https://github.com/zocomputer/zov2-code/blob/3530b39a94e929be74c3d9202bace84f47b21b44/packages/agent-sdk/src/workspace-io.ts#L115)

Run a shell command and wait for its completion.

#### Parameters

##### options

###### command

`string`

###### workingDirectory?

`string`

#### Returns

`PromiseLike`\<\{ `exitCode`: `number`; `stderr`: `string`; `stdout`: `string`; \}\>

***

### writeBinaryFile

> `readonly` **writeBinaryFile**: (`options`) => `PromiseLike`\<`void`\>

Defined in: [packages/agent-sdk/src/workspace-io.ts:110](https://github.com/zocomputer/zov2-code/blob/3530b39a94e929be74c3d9202bace84f47b21b44/packages/agent-sdk/src/workspace-io.ts#L110)

Write a file, creating parent directories and overwriting.

#### Parameters

##### options

###### content

`Uint8Array`

###### path

`string`

#### Returns

`PromiseLike`\<`void`\>
