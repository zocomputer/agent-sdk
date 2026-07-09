[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxSuggestedDefaults

# Interface: StateSandboxSuggestedDefaults

Defined in: [packages/agent-sdk/src/state-sandbox.ts:61](https://github.com/zocomputer/zov2-code/blob/c013587aa4ecd77d27b6774cf5b1fead3e0418d5/packages/agent-sdk/src/state-sandbox.ts#L61)

Optional engine and partition defaults to suggest when requesting a sandbox handle.
The broker may ignore these; they influence zero-config binding, not enforcement.

## Properties

### engine?

> `readonly` `optional` **engine?**: `"sandbox-daytona"`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:62](https://github.com/zocomputer/zov2-code/blob/c013587aa4ecd77d27b6774cf5b1fead3e0418d5/packages/agent-sdk/src/state-sandbox.ts#L62)

***

### partition?

> `readonly` `optional` **partition?**: [`StateSandboxPartition`](../type-aliases/StateSandboxPartition.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:63](https://github.com/zocomputer/zov2-code/blob/c013587aa4ecd77d27b6774cf5b1fead3e0418d5/packages/agent-sdk/src/state-sandbox.ts#L63)
