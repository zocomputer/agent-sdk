[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxClient

# Interface: StateSandboxClient

Defined in: [packages/agent-sdk/src/state-sandbox.ts:385](https://github.com/zocomputer/zov2-code/blob/431612973a5c06efcad7920699932d7fe7145ddd/packages/agent-sdk/src/state-sandbox.ts#L385)

High-level client for a state sandbox with automatic handle renewal and session caching.
Exposes exec, spawn, and file I/O; manages the underlying session lifecycle transparently.

## Properties

### files

> `readonly` **files**: [`StateSandboxFilesClient`](StateSandboxFilesClient.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:386](https://github.com/zocomputer/zov2-code/blob/431612973a5c06efcad7920699932d7fe7145ddd/packages/agent-sdk/src/state-sandbox.ts#L386)

## Methods

### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:400](https://github.com/zocomputer/zov2-code/blob/431612973a5c06efcad7920699932d7fe7145ddd/packages/agent-sdk/src/state-sandbox.ts#L400)

Disposes the client, closing the underlying session and any pending operations.

#### Returns

`Promise`\<`void`\>

***

### exec()

> **exec**(`command`, `options?`): `Promise`\<[`StateSandboxRunResult`](StateSandboxRunResult.md)\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:390](https://github.com/zocomputer/zov2-code/blob/431612973a5c06efcad7920699932d7fe7145ddd/packages/agent-sdk/src/state-sandbox.ts#L390)

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

Defined in: [packages/agent-sdk/src/state-sandbox.ts:395](https://github.com/zocomputer/zov2-code/blob/431612973a5c06efcad7920699932d7fe7145ddd/packages/agent-sdk/src/state-sandbox.ts#L395)

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

Defined in: [packages/agent-sdk/src/state-sandbox.ts:388](https://github.com/zocomputer/zov2-code/blob/431612973a5c06efcad7920699932d7fe7145ddd/packages/agent-sdk/src/state-sandbox.ts#L388)

Returns the current lifecycle state of the client.

#### Returns

[`StateSandboxStatus`](../type-aliases/StateSandboxStatus.md)
