[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / expectedTaskToolNames

# Function: expectedTaskToolNames()

> **expectedTaskToolNames**(`options`): `string`[]

Defined in: [packages/agent-sdk/src/task.ts:73](https://github.com/zocomputer/zov2-code/blob/e58b3bae5fbd35c5f457130033750c9c33ee334c/packages/agent-sdk/src/task.ts#L73)

The exact file set (sorted, without `.ts`) a task subagent's `tools/` dir
must contain: every parent tool minus the exclusions, plus one disable shim
per [TASK\_DISABLED\_BUILTINS](../variables/TASK_DISABLED_BUILTINS.md) entry. A consumer's manifest test diffs
its directory against this so tool-surface drift fails CI.

## Parameters

### options

[`TaskToolManifestOptions`](../interfaces/TaskToolManifestOptions.md)

## Returns

`string`[]
