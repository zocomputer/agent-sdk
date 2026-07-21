[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SandboxProcessLike

# Interface: SandboxProcessLike

Defined in: [packages/agent-sdk/src/sandbox-run.ts:37](https://github.com/zocomputer/zov2-code/blob/9d3f4b0b6ac2b9a8a8d1307a4590af07d0d7978f/packages/agent-sdk/src/sandbox-run.ts#L37)

The structural slice of a spawned sandbox process the runner needs.
Matches eve's `SandboxProcess` (itself the AI SDK sandbox process shape):
byte streams for stdout/stderr, a wait for the exit code, and an
idempotent kill.

## Properties

### stderr

> `readonly` **stderr**: `ReadableStream`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Defined in: [packages/agent-sdk/src/sandbox-run.ts:41](https://github.com/zocomputer/zov2-code/blob/9d3f4b0b6ac2b9a8a8d1307a4590af07d0d7978f/packages/agent-sdk/src/sandbox-run.ts#L41)

Bytes the process writes to standard error.

***

### stdout

> `readonly` **stdout**: `ReadableStream`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Defined in: [packages/agent-sdk/src/sandbox-run.ts:39](https://github.com/zocomputer/zov2-code/blob/9d3f4b0b6ac2b9a8a8d1307a4590af07d0d7978f/packages/agent-sdk/src/sandbox-run.ts#L39)

Bytes the process writes to standard output.

## Methods

### kill()

> **kill**(): `PromiseLike`\<`void`\>

Defined in: [packages/agent-sdk/src/sandbox-run.ts:45](https://github.com/zocomputer/zov2-code/blob/9d3f4b0b6ac2b9a8a8d1307a4590af07d0d7978f/packages/agent-sdk/src/sandbox-run.ts#L45)

Terminate the process. Idempotent.

#### Returns

`PromiseLike`\<`void`\>

***

### wait()

> **wait**(): `PromiseLike`\<\{ `exitCode`: `number`; \}\>

Defined in: [packages/agent-sdk/src/sandbox-run.ts:43](https://github.com/zocomputer/zov2-code/blob/9d3f4b0b6ac2b9a8a8d1307a4590af07d0d7978f/packages/agent-sdk/src/sandbox-run.ts#L43)

Resolves when the process exits, with its exit code.

#### Returns

`PromiseLike`\<\{ `exitCode`: `number`; \}\>
