[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxClient

# Interface: StateSandboxClient

Defined in: [packages/agent-sdk/src/state-sandbox.ts:340](https://github.com/zocomputer/zov2-code/blob/27ad75132e5ee857792f30c55f5617b1fdae5408/packages/agent-sdk/src/state-sandbox.ts#L340)

High-level client for a state sandbox with automatic handle renewal and session caching.
Exposes exec, spawn, and file I/O; manages the underlying session lifecycle transparently.

## Properties

### files

> `readonly` **files**: [`StateSandboxFilesClient`](StateSandboxFilesClient.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:341](https://github.com/zocomputer/zov2-code/blob/27ad75132e5ee857792f30c55f5617b1fdae5408/packages/agent-sdk/src/state-sandbox.ts#L341)

## Methods

### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:355](https://github.com/zocomputer/zov2-code/blob/27ad75132e5ee857792f30c55f5617b1fdae5408/packages/agent-sdk/src/state-sandbox.ts#L355)

Disposes the client, closing the underlying session and any pending operations.

#### Returns

`Promise`\<`void`\>

***

### exec()

> **exec**(`command`, `options?`): `Promise`\<[`StateSandboxRunResult`](StateSandboxRunResult.md)\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:345](https://github.com/zocomputer/zov2-code/blob/27ad75132e5ee857792f30c55f5617b1fdae5408/packages/agent-sdk/src/state-sandbox.ts#L345)

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

Defined in: [packages/agent-sdk/src/state-sandbox.ts:350](https://github.com/zocomputer/zov2-code/blob/27ad75132e5ee857792f30c55f5617b1fdae5408/packages/agent-sdk/src/state-sandbox.ts#L350)

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

Defined in: [packages/agent-sdk/src/state-sandbox.ts:343](https://github.com/zocomputer/zov2-code/blob/27ad75132e5ee857792f30c55f5617b1fdae5408/packages/agent-sdk/src/state-sandbox.ts#L343)

Returns the current lifecycle state of the client.

#### Returns

[`StateSandboxStatus`](../type-aliases/StateSandboxStatus.md)
