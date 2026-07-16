[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxSpawnedProcess

# Interface: StateSandboxSpawnedProcess

Defined in: [packages/agent-sdk/src/state-sandbox.ts:270](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/state-sandbox.ts#L270)

A running process spawned in a state sandbox.
Provides streaming stdout/stderr and a promise that resolves to the exit code.

## Properties

### exitCode

> `readonly` **exitCode**: `Promise`\<`number`\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:273](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/state-sandbox.ts#L273)

***

### stderr

> `readonly` **stderr**: `AsyncIterable`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:272](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/state-sandbox.ts#L272)

***

### stdout

> `readonly` **stdout**: `AsyncIterable`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:271](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/state-sandbox.ts#L271)

## Methods

### kill()

> **kill**(`signal?`): `void` \| `Promise`\<`void`\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:275](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/state-sandbox.ts#L275)

Kills the process with an optional signal (e.g. `"SIGTERM"`, `"SIGKILL"`).

#### Parameters

##### signal?

`string`

#### Returns

`void` \| `Promise`\<`void`\>
