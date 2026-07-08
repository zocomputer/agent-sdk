[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxClient

# Interface: StateSandboxClient

Defined in: [packages/agent-sdk/src/state-sandbox.ts:349](https://github.com/zocomputer/zov2-code/blob/aba140d6dd71d0ea05075bf6e9ebcc5739f7a7b3/packages/agent-sdk/src/state-sandbox.ts#L349)

High-level client for a state sandbox with automatic handle renewal and session caching.
Exposes exec, spawn, and file I/O; manages the underlying session lifecycle transparently.

## Properties

### files

> `readonly` **files**: [`StateSandboxFilesClient`](StateSandboxFilesClient.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:350](https://github.com/zocomputer/zov2-code/blob/aba140d6dd71d0ea05075bf6e9ebcc5739f7a7b3/packages/agent-sdk/src/state-sandbox.ts#L350)

## Methods

### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:364](https://github.com/zocomputer/zov2-code/blob/aba140d6dd71d0ea05075bf6e9ebcc5739f7a7b3/packages/agent-sdk/src/state-sandbox.ts#L364)

Disposes the client, closing the underlying session and any pending operations.

#### Returns

`Promise`\<`void`\>

***

### exec()

> **exec**(`command`, `options?`): `Promise`\<[`StateSandboxRunResult`](StateSandboxRunResult.md)\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:354](https://github.com/zocomputer/zov2-code/blob/aba140d6dd71d0ea05075bf6e9ebcc5739f7a7b3/packages/agent-sdk/src/state-sandbox.ts#L354)

Runs a shell command to completion in the sandbox. Requires `rw` access.

#### Parameters

##### command

`string`

##### options?

[`StateSandboxRunOptions`](StateSandboxRunOptions.md)

#### Returns

`Promise`\<[`StateSandboxRunResult`](StateSandboxRunResult.md)\>

***

### spawn()

> **spawn**(`command`, `options?`): `Promise`\<[`StateSandboxSpawnedProcess`](StateSandboxSpawnedProcess.md)\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:359](https://github.com/zocomputer/zov2-code/blob/aba140d6dd71d0ea05075bf6e9ebcc5739f7a7b3/packages/agent-sdk/src/state-sandbox.ts#L359)

Spawns a long-running shell command with streaming output. Requires `rw` access.

#### Parameters

##### command

`string`

##### options?

[`StateSandboxRunOptions`](StateSandboxRunOptions.md)

#### Returns

`Promise`\<[`StateSandboxSpawnedProcess`](StateSandboxSpawnedProcess.md)\>

***

### status()

> **status**(): [`StateSandboxStatus`](../type-aliases/StateSandboxStatus.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:352](https://github.com/zocomputer/zov2-code/blob/aba140d6dd71d0ea05075bf6e9ebcc5739f7a7b3/packages/agent-sdk/src/state-sandbox.ts#L352)

Returns the current lifecycle state of the client.

#### Returns

[`StateSandboxStatus`](../type-aliases/StateSandboxStatus.md)
