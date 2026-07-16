[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxSuggestedDefaults

# Interface: StateSandboxSuggestedDefaults

Defined in: [packages/agent-sdk/src/state-sandbox.ts:63](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/state-sandbox.ts#L63)

Optional engine and partition defaults to suggest when requesting a sandbox handle.
The broker may ignore these; they influence zero-config binding, not enforcement.

## Properties

### engine?

> `readonly` `optional` **engine?**: `"sandbox-daytona"`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:64](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/state-sandbox.ts#L64)

***

### partition?

> `readonly` `optional` **partition?**: [`StateSandboxPartition`](../type-aliases/StateSandboxPartition.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:65](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/state-sandbox.ts#L65)
