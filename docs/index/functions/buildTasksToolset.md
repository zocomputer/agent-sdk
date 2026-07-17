[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / buildTasksToolset

# Function: buildTasksToolset()

> **buildTasksToolset**(`opts`): \{ `await_task`: `ToolDefinition`\<\{ `task_id`: `string`; `wait_ms?`: `number`; \}, \{ `elapsedMs`: `number`; `label`: `string`; `result`: `unknown`; `status`: `"error"` \| `"running"` \| `"done"` \| `"lost"`; `task_id`: `string` & `$brand`\<`"TaskId"`\>; `tool`: `string`; \} \| \{ `elapsedMs`: `number`; `error`: `string`; `label`: `string`; `status`: `"error"` \| `"running"` \| `"done"` \| `"lost"`; `task_id`: `string` & `$brand`\<`"TaskId"`\>; `tool`: `string`; \} \| \{ `elapsedMs`: `number`; `label`: `string`; `progress?`: \{ \} \| `null`; `status`: `"error"` \| `"running"` \| `"done"` \| `"lost"`; `task_id`: `string` & `$brand`\<`"TaskId"`\>; `tool`: `string`; \}\>; `check_tasks`: `ToolDefinition`\<`Record`\<`string`, `never`\>, \{ `runningCount`: `number`; `tasks`: `object`[]; \}\>; `run_async`: `ToolDefinition`\<\{ `input`: `Record`\<`string`, `unknown`\>; `tool`: `string`; \}, \{ `note`: `string`; `status`: `"running"`; `task_id`: `string` & `$brand`\<`"TaskId"`\>; `tool`: `string`; \}\>; \} \| `null`

Defined in: [packages/agent-sdk/src/tools/tasks.ts:58](https://github.com/zocomputer/zov2-code/blob/178825142421d42c04f57b0afbc80612a16fe4c6/packages/agent-sdk/src/tools/tasks.ts#L58)

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

\{ `await_task`: `ToolDefinition`\<\{ `task_id`: `string`; `wait_ms?`: `number`; \}, \{ `elapsedMs`: `number`; `label`: `string`; `result`: `unknown`; `status`: `"error"` \| `"running"` \| `"done"` \| `"lost"`; `task_id`: `string` & `$brand`\<`"TaskId"`\>; `tool`: `string`; \} \| \{ `elapsedMs`: `number`; `error`: `string`; `label`: `string`; `status`: `"error"` \| `"running"` \| `"done"` \| `"lost"`; `task_id`: `string` & `$brand`\<`"TaskId"`\>; `tool`: `string`; \} \| \{ `elapsedMs`: `number`; `label`: `string`; `progress?`: \{ \} \| `null`; `status`: `"error"` \| `"running"` \| `"done"` \| `"lost"`; `task_id`: `string` & `$brand`\<`"TaskId"`\>; `tool`: `string`; \}\>; `check_tasks`: `ToolDefinition`\<`Record`\<`string`, `never`\>, \{ `runningCount`: `number`; `tasks`: `object`[]; \}\>; `run_async`: `ToolDefinition`\<\{ `input`: `Record`\<`string`, `unknown`\>; `tool`: `string`; \}, \{ `note`: `string`; `status`: `"running"`; `task_id`: `string` & `$brand`\<`"TaskId"`\>; `tool`: `string`; \}\>; \} \| `null`
