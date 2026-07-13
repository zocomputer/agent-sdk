[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / buildTasksToolset

# Function: buildTasksToolset()

> **buildTasksToolset**(`opts`): \{ `await_task`: `ToolDefinition`\<\{ `task_id`: `string`; `wait_ms?`: `number`; \}, \{ `elapsedMs`: `number`; `label`: `string`; `result`: `unknown`; `status`: `"running"` \| `"done"` \| `"error"` \| `"lost"`; `task_id`: `string`; `tool`: `string`; \} \| \{ `elapsedMs`: `number`; `error`: `string`; `label`: `string`; `status`: `"running"` \| `"done"` \| `"error"` \| `"lost"`; `task_id`: `string`; `tool`: `string`; \} \| \{ `elapsedMs`: `number`; `label`: `string`; `progress?`: \{ \} \| `null`; `status`: `"running"` \| `"done"` \| `"error"` \| `"lost"`; `task_id`: `string`; `tool`: `string`; \}\>; `check_tasks`: `ToolDefinition`\<`Record`\<`string`, `never`\>, \{ `runningCount`: `number`; `tasks`: `object`[]; \}\>; `run_async`: `ToolDefinition`\<\{ `input`: `Record`\<`string`, `unknown`\>; `tool`: `string`; \}, \{ `note`: `string`; `status`: `"running"`; `task_id`: `string`; `tool`: `string`; \}\>; \} \| `null`

Defined in: [packages/agent-sdk/src/tools/tasks.ts:53](https://github.com/zocomputer/zov2-code/blob/760605b8ac267b8d97156760bb2d6e6d1b69ada8/packages/agent-sdk/src/tools/tasks.ts#L53)

Build the `{run_async, check_tasks, await_task}` toolset. Exported with its
concrete types for direct testing; agents wire it through createTasksTools
(a `defineDynamic` erases entry types on the wire-facing surface).

## Parameters

### opts

#### backgroundables

readonly [`BackgroundableOp`](../interfaces/BackgroundableOp.md)[]

#### registry

[`TaskRegistry`](../interfaces/TaskRegistry.md)

## Returns

\{ `await_task`: `ToolDefinition`\<\{ `task_id`: `string`; `wait_ms?`: `number`; \}, \{ `elapsedMs`: `number`; `label`: `string`; `result`: `unknown`; `status`: `"running"` \| `"done"` \| `"error"` \| `"lost"`; `task_id`: `string`; `tool`: `string`; \} \| \{ `elapsedMs`: `number`; `error`: `string`; `label`: `string`; `status`: `"running"` \| `"done"` \| `"error"` \| `"lost"`; `task_id`: `string`; `tool`: `string`; \} \| \{ `elapsedMs`: `number`; `label`: `string`; `progress?`: \{ \} \| `null`; `status`: `"running"` \| `"done"` \| `"error"` \| `"lost"`; `task_id`: `string`; `tool`: `string`; \}\>; `check_tasks`: `ToolDefinition`\<`Record`\<`string`, `never`\>, \{ `runningCount`: `number`; `tasks`: `object`[]; \}\>; `run_async`: `ToolDefinition`\<\{ `input`: `Record`\<`string`, `unknown`\>; `tool`: `string`; \}, \{ `note`: `string`; `status`: `"running"`; `task_id`: `string`; `tool`: `string`; \}\>; \} \| `null`
