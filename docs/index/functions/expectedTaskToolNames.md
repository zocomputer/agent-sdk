[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / expectedTaskToolNames

# Function: expectedTaskToolNames()

> **expectedTaskToolNames**(`options`): `string`[]

Defined in: [packages/agent-sdk/src/task.ts:80](https://github.com/zocomputer/zov2-code/blob/edfd579427fbfafd3e21ca75b7f30a50695b254b/packages/agent-sdk/src/task.ts#L80)

The exact file set (sorted, without `.ts`) a task subagent's `tools/` dir
must contain: every parent tool minus the exclusions, plus one disable shim
per [TASK\_DISABLED\_BUILTINS](../variables/TASK_DISABLED_BUILTINS.md) entry. A consumer's manifest test diffs
its directory against this so tool-surface drift fails CI.

## Parameters

### options

[`TaskToolManifestOptions`](../interfaces/TaskToolManifestOptions.md)

## Returns

`string`[]
