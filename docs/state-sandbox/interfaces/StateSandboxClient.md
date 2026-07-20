[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxClient

# Interface: StateSandboxClient

Defined in: [packages/agent-sdk/src/state-sandbox.ts:359](https://github.com/zocomputer/zov2-code/blob/9a2687559528851e1e25b6b64341058d2d74e9dc/packages/agent-sdk/src/state-sandbox.ts#L359)

High-level client for a state sandbox with automatic handle renewal and session caching.
Exposes exec, spawn, and file I/O; manages the underlying session lifecycle transparently.

## Properties

### files

> `readonly` **files**: [`StateSandboxFilesClient`](StateSandboxFilesClient.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:360](https://github.com/zocomputer/zov2-code/blob/9a2687559528851e1e25b6b64341058d2d74e9dc/packages/agent-sdk/src/state-sandbox.ts#L360)

## Methods

### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:374](https://github.com/zocomputer/zov2-code/blob/9a2687559528851e1e25b6b64341058d2d74e9dc/packages/agent-sdk/src/state-sandbox.ts#L374)

Disposes the client, closing the underlying session and any pending operations.

#### Returns

`Promise`\<`void`\>

***

### exec()

> **exec**(`command`, `options?`): `Promise`\<[`StateSandboxRunResult`](StateSandboxRunResult.md)\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:364](https://github.com/zocomputer/zov2-code/blob/9a2687559528851e1e25b6b64341058d2d74e9dc/packages/agent-sdk/src/state-sandbox.ts#L364)

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

Defined in: [packages/agent-sdk/src/state-sandbox.ts:369](https://github.com/zocomputer/zov2-code/blob/9a2687559528851e1e25b6b64341058d2d74e9dc/packages/agent-sdk/src/state-sandbox.ts#L369)

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

Defined in: [packages/agent-sdk/src/state-sandbox.ts:362](https://github.com/zocomputer/zov2-code/blob/9a2687559528851e1e25b6b64341058d2d74e9dc/packages/agent-sdk/src/state-sandbox.ts#L362)

Returns the current lifecycle state of the client.

#### Returns

[`StateSandboxStatus`](../type-aliases/StateSandboxStatus.md)
