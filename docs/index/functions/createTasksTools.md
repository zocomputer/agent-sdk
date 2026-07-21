[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createTasksTools

# Function: createTasksTools()

> **createTasksTools**(`opts`): `DynamicSentinel`\<\{ `await_task`: `ToolDefinition`\<\{ `task_id`: `string`; `wait_ms?`: `number`; \}, \{ `elapsedMs`: `number`; `label`: `string`; `result`: `unknown`; `status`: `"error"` \| `"running"` \| `"done"` \| `"lost"`; `task_id`: `string` & `$brand`\<`"TaskId"`\>; `tool`: `string`; \} \| \{ `elapsedMs`: `number`; `error`: `string`; `label`: `string`; `status`: `"error"` \| `"running"` \| `"done"` \| `"lost"`; `task_id`: `string` & `$brand`\<`"TaskId"`\>; `tool`: `string`; \} \| \{ `elapsedMs`: `number`; `label`: `string`; `progress?`: \{ \} \| `null`; `status`: `"error"` \| `"running"` \| `"done"` \| `"lost"`; `task_id`: `string` & `$brand`\<`"TaskId"`\>; `tool`: `string`; \}\>; `check_tasks`: `ToolDefinition`\<`Record`\<`string`, `never`\>, \{ `runningCount`: `number`; `tasks`: `object`[]; \}\>; `run_async`: `ToolDefinition`\<\{ `input`: `Record`\<`string`, `unknown`\>; `tool`: `string`; \}, \{ `note`: `string`; `status`: `"running"`; `task_id`: `string` & `$brand`\<`"TaskId"`\>; `tool`: `string`; \}\>; \} \| `null`\>

Defined in: [packages/agent-sdk/src/tools/tasks.ts:176](https://github.com/zocomputer/zov2-code/blob/4b68538420ff1392c629a63ef43ccfd25f463014/packages/agent-sdk/src/tools/tasks.ts#L176)

The toolset as one dynamic definition. Session-scoped on purpose: tool
definitions sit in the model's cached prompt prefix, so the run_async
catalog is built once per session and stays byte-identical thereafter —
live task state rides check_tasks' RESULT, never a description.

## Parameters

### opts

#### backgroundables

readonly [`BackgroundableOp`](../interfaces/BackgroundableOp.md)[]

#### registry

[`TaskRegistry`](../interfaces/TaskRegistry.md)

## Returns

`DynamicSentinel`\<\{ `await_task`: `ToolDefinition`\<\{ `task_id`: `string`; `wait_ms?`: `number`; \}, \{ `elapsedMs`: `number`; `label`: `string`; `result`: `unknown`; `status`: `"error"` \| `"running"` \| `"done"` \| `"lost"`; `task_id`: `string` & `$brand`\<`"TaskId"`\>; `tool`: `string`; \} \| \{ `elapsedMs`: `number`; `error`: `string`; `label`: `string`; `status`: `"error"` \| `"running"` \| `"done"` \| `"lost"`; `task_id`: `string` & `$brand`\<`"TaskId"`\>; `tool`: `string`; \} \| \{ `elapsedMs`: `number`; `label`: `string`; `progress?`: \{ \} \| `null`; `status`: `"error"` \| `"running"` \| `"done"` \| `"lost"`; `task_id`: `string` & `$brand`\<`"TaskId"`\>; `tool`: `string`; \}\>; `check_tasks`: `ToolDefinition`\<`Record`\<`string`, `never`\>, \{ `runningCount`: `number`; `tasks`: `object`[]; \}\>; `run_async`: `ToolDefinition`\<\{ `input`: `Record`\<`string`, `unknown`\>; `tool`: `string`; \}, \{ `note`: `string`; `status`: `"running"`; `task_id`: `string` & `$brand`\<`"TaskId"`\>; `tool`: `string`; \}\>; \} \| `null`\>
