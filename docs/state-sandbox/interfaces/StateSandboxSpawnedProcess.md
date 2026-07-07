[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxSpawnedProcess

# Interface: StateSandboxSpawnedProcess

Defined in: [packages/agent-sdk/src/state-sandbox.ts:257](https://github.com/zocomputer/zov2-code/blob/6ab5ae927225cb2a14ac9cd70c43ecf9eb01921d/packages/agent-sdk/src/state-sandbox.ts#L257)

A running process spawned in a state sandbox.
Provides streaming stdout/stderr and a promise that resolves to the exit code.

## Properties

### exitCode

> `readonly` **exitCode**: `Promise`\<`number`\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:260](https://github.com/zocomputer/zov2-code/blob/6ab5ae927225cb2a14ac9cd70c43ecf9eb01921d/packages/agent-sdk/src/state-sandbox.ts#L260)

***

### stderr

> `readonly` **stderr**: `AsyncIterable`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:259](https://github.com/zocomputer/zov2-code/blob/6ab5ae927225cb2a14ac9cd70c43ecf9eb01921d/packages/agent-sdk/src/state-sandbox.ts#L259)

***

### stdout

> `readonly` **stdout**: `AsyncIterable`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:258](https://github.com/zocomputer/zov2-code/blob/6ab5ae927225cb2a14ac9cd70c43ecf9eb01921d/packages/agent-sdk/src/state-sandbox.ts#L258)

## Methods

### kill()

> **kill**(`signal?`): `void` \| `Promise`\<`void`\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:262](https://github.com/zocomputer/zov2-code/blob/6ab5ae927225cb2a14ac9cd70c43ecf9eb01921d/packages/agent-sdk/src/state-sandbox.ts#L262)

Kills the process with an optional signal (e.g. `"SIGTERM"`, `"SIGKILL"`).

#### Parameters

##### signal?

`string`

#### Returns

`void` \| `Promise`\<`void`\>
