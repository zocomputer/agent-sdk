[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / buildTasksToolset

# Function: buildTasksToolset()

> **buildTasksToolset**(`opts`): \{ `await_task`: `ToolDefinition`\<\{ `task_id`: `string`; `wait_ms?`: `number`; \}, \{ `elapsedMs`: `number`; `label`: `string`; `result`: `unknown`; `status`: `"running"` \| `"done"` \| `"error"` \| `"lost"`; `task_id`: `string`; `tool`: `string`; \} \| \{ `elapsedMs`: `number`; `error`: `string`; `label`: `string`; `status`: `"running"` \| `"done"` \| `"error"` \| `"lost"`; `task_id`: `string`; `tool`: `string`; \} \| \{ `elapsedMs`: `number`; `label`: `string`; `progress?`: \{ \} \| `null`; `status`: `"running"` \| `"done"` \| `"error"` \| `"lost"`; `task_id`: `string`; `tool`: `string`; \}\>; `check_tasks`: `ToolDefinition`\<`Record`\<`string`, `never`\>, \{ `runningCount`: `number`; `tasks`: `object`[]; \}\>; `run_async`: `ToolDefinition`\<\{ `input`: `Record`\<`string`, `unknown`\>; `notify?`: \{ `debounce_ms?`: `number`; `pattern`: `string`; `reason`: `string`; \}; `notify_on_complete?`: `boolean`; `tool`: `string`; \}, \{ `note`: `string`; `status`: `"running"`; `task_id`: `string`; `tool`: `string`; `watching?`: `string`; \}\>; \} \| `null`

Defined in: [packages/agent-sdk/src/tools/tasks.ts:59](https://github.com/zocomputer/zov2-code/blob/27ad75132e5ee857792f30c55f5617b1fdae5408/packages/agent-sdk/src/tools/tasks.ts#L59)

Build the `{run_async, check_tasks, await_task}` toolset. Exported with its
concrete types for direct testing; agents wire it through createTasksTools
(a `defineDynamic` erases entry types on the wire-facing surface).

## Parameters

### opts

#### backgroundables

readonly [`BackgroundableOp`](../interfaces/BackgroundableOp.md)[]

#### registry

[`TaskRegistry`](../interfaces/TaskRegistry.md)

#### steerInbox?

[`SteerSource`](../type-aliases/SteerSource.md) \| `null`

When set, steered messages ride these tools' results (see ../steer-tool).

## Returns

\{ `await_task`: `ToolDefinition`\<\{ `task_id`: `string`; `wait_ms?`: `number`; \}, \{ `elapsedMs`: `number`; `label`: `string`; `result`: `unknown`; `status`: `"running"` \| `"done"` \| `"error"` \| `"lost"`; `task_id`: `string`; `tool`: `string`; \} \| \{ `elapsedMs`: `number`; `error`: `string`; `label`: `string`; `status`: `"running"` \| `"done"` \| `"error"` \| `"lost"`; `task_id`: `string`; `tool`: `string`; \} \| \{ `elapsedMs`: `number`; `label`: `string`; `progress?`: \{ \} \| `null`; `status`: `"running"` \| `"done"` \| `"error"` \| `"lost"`; `task_id`: `string`; `tool`: `string`; \}\>; `check_tasks`: `ToolDefinition`\<`Record`\<`string`, `never`\>, \{ `runningCount`: `number`; `tasks`: `object`[]; \}\>; `run_async`: `ToolDefinition`\<\{ `input`: `Record`\<`string`, `unknown`\>; `notify?`: \{ `debounce_ms?`: `number`; `pattern`: `string`; `reason`: `string`; \}; `notify_on_complete?`: `boolean`; `tool`: `string`; \}, \{ `note`: `string`; `status`: `"running"`; `task_id`: `string`; `tool`: `string`; `watching?`: `string`; \}\>; \} \| `null`
