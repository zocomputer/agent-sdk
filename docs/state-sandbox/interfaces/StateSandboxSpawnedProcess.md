[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxSpawnedProcess

# Interface: StateSandboxSpawnedProcess

Defined in: [packages/agent-sdk/src/state-sandbox.ts:266](https://github.com/zocomputer/zov2-code/blob/3f2b99c534a9f8d96ad85214e02d7c759a75762c/packages/agent-sdk/src/state-sandbox.ts#L266)

A running process spawned in a state sandbox.
Provides streaming stdout/stderr and a promise that resolves to the exit code.

## Properties

### exitCode

> `readonly` **exitCode**: `Promise`\<`number`\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:269](https://github.com/zocomputer/zov2-code/blob/3f2b99c534a9f8d96ad85214e02d7c759a75762c/packages/agent-sdk/src/state-sandbox.ts#L269)

***

### stderr

> `readonly` **stderr**: `AsyncIterable`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:268](https://github.com/zocomputer/zov2-code/blob/3f2b99c534a9f8d96ad85214e02d7c759a75762c/packages/agent-sdk/src/state-sandbox.ts#L268)

***

### stdout

> `readonly` **stdout**: `AsyncIterable`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:267](https://github.com/zocomputer/zov2-code/blob/3f2b99c534a9f8d96ad85214e02d7c759a75762c/packages/agent-sdk/src/state-sandbox.ts#L267)

## Methods

### kill()

> **kill**(`signal?`): `void` \| `Promise`\<`void`\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:271](https://github.com/zocomputer/zov2-code/blob/3f2b99c534a9f8d96ad85214e02d7c759a75762c/packages/agent-sdk/src/state-sandbox.ts#L271)

Kills the process with an optional signal (e.g. `"SIGTERM"`, `"SIGKILL"`).

#### Parameters

##### signal?

`string`

#### Returns

`void` \| `Promise`\<`void`\>
