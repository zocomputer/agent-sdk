[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-sandbox](../README.md) / StateSandboxSuggestedDefaults

# Interface: StateSandboxSuggestedDefaults

Defined in: [packages/agent-sdk/src/state-sandbox.ts:63](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/state-sandbox.ts#L63)

Optional engine and partition defaults to suggest when requesting a sandbox handle.
The broker may ignore these; they influence zero-config binding, not enforcement.

## Properties

### engine?

> `readonly` `optional` **engine?**: `"sandbox-daytona"`

Defined in: [packages/agent-sdk/src/state-sandbox.ts:64](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/state-sandbox.ts#L64)

***

### lifecycle?

> `readonly` `optional` **lifecycle?**: `Readonly`\<`Record`\<`string`, `string` \| `number` \| `boolean`\>\>

Defined in: [packages/agent-sdk/src/state-sandbox.ts:71](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/state-sandbox.ts#L71)

The declaration's lifecycle overrides (e.g. `suspendAfterMinutes`). The
broker consumes them only when the zero-config store first materializes;
afterwards deploy is the only policy write path.

***

### partition?

> `readonly` `optional` **partition?**: [`StateSandboxPartition`](../type-aliases/StateSandboxPartition.md)

Defined in: [packages/agent-sdk/src/state-sandbox.ts:65](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/state-sandbox.ts#L65)
