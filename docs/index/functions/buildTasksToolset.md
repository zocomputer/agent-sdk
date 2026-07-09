[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / buildTasksToolset

# Function: buildTasksToolset()

> **buildTasksToolset**(`opts`): \{ `await_task`: `ToolDefinition`\<\{ `task_id`: `string`; `wait_ms?`: `number`; \}, \{ `elapsedMs`: `number`; `label`: `string`; `result`: `unknown`; `status`: `"running"` \| `"done"` \| `"error"` \| `"lost"`; `task_id`: `string`; `tool`: `string`; \} \| \{ `elapsedMs`: `number`; `error`: `string`; `label`: `string`; `status`: `"running"` \| `"done"` \| `"error"` \| `"lost"`; `task_id`: `string`; `tool`: `string`; \} \| \{ `elapsedMs`: `number`; `label`: `string`; `progress?`: \{ \} \| `null`; `status`: `"running"` \| `"done"` \| `"error"` \| `"lost"`; `task_id`: `string`; `tool`: `string`; \}\>; `check_tasks`: `ToolDefinition`\<`Record`\<`string`, `never`\>, \{ `runningCount`: `number`; `tasks`: `object`[]; \}\>; `run_async`: `ToolDefinition`\<\{ `input`: `Record`\<`string`, `unknown`\>; `tool`: `string`; \}, \{ `note`: `string`; `status`: `"running"`; `task_id`: `string`; `tool`: `string`; `watching?`: `string`; \}\>; \} \| `null`

Defined in: [packages/agent-sdk/src/tools/tasks.ts:60](https://github.com/zocomputer/zov2-code/blob/2c62d8b884523ef65360fa00bdaffe3cdda99189/packages/agent-sdk/src/tools/tasks.ts#L60)

Build the `{run_async, check_tasks, await_task}` toolset. Exported with its
concrete types for direct testing; agents wire it through createTasksTools
(a `defineDynamic` erases entry types on the wire-facing surface).

## Parameters

### opts

#### backgroundables

readonly [`BackgroundableOp`](../interfaces/BackgroundableOp.md)[]

#### notifications?

`boolean`

Advertise + wire `notify`/`notify_on_complete` (default true). Set false
for agents with no park-delivery handler registered, where a watcher
would be a false promise: notifications would queue but never deliver.

#### registry

[`TaskRegistry`](../interfaces/TaskRegistry.md)

#### steerInbox?

[`SteerSource`](../type-aliases/SteerSource.md) \| `null`

When set, steered messages ride these tools' results (see ../steer-tool).

## Returns

\{ `await_task`: `ToolDefinition`\<\{ `task_id`: `string`; `wait_ms?`: `number`; \}, \{ `elapsedMs`: `number`; `label`: `string`; `result`: `unknown`; `status`: `"running"` \| `"done"` \| `"error"` \| `"lost"`; `task_id`: `string`; `tool`: `string`; \} \| \{ `elapsedMs`: `number`; `error`: `string`; `label`: `string`; `status`: `"running"` \| `"done"` \| `"error"` \| `"lost"`; `task_id`: `string`; `tool`: `string`; \} \| \{ `elapsedMs`: `number`; `label`: `string`; `progress?`: \{ \} \| `null`; `status`: `"running"` \| `"done"` \| `"error"` \| `"lost"`; `task_id`: `string`; `tool`: `string`; \}\>; `check_tasks`: `ToolDefinition`\<`Record`\<`string`, `never`\>, \{ `runningCount`: `number`; `tasks`: `object`[]; \}\>; `run_async`: `ToolDefinition`\<\{ `input`: `Record`\<`string`, `unknown`\>; `tool`: `string`; \}, \{ `note`: `string`; `status`: `"running"`; `task_id`: `string`; `tool`: `string`; `watching?`: `string`; \}\>; \} \| `null`
