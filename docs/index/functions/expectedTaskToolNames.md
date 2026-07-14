[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / expectedTaskToolNames

# Function: expectedTaskToolNames()

> **expectedTaskToolNames**(`options`): `string`[]

Defined in: [packages/agent-sdk/src/task.ts:67](https://github.com/zocomputer/zov2-code/blob/2f6c8cc3fd1672c6cd6d12c28dbf229ac82949b0/packages/agent-sdk/src/task.ts#L67)

The exact file set (sorted, without `.ts`) a task subagent's `tools/` dir
must contain: every parent tool minus the exclusions, plus one disable shim
per [TASK\_DISABLED\_BUILTINS](../variables/TASK_DISABLED_BUILTINS.md) entry. A consumer's manifest test diffs
its directory against this so tool-surface drift fails CI.

## Parameters

### options

[`TaskToolManifestOptions`](../interfaces/TaskToolManifestOptions.md)

## Returns

`string`[]
