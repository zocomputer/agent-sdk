[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createTasksTools

# Function: createTasksTools()

> **createTasksTools**(`opts`): `DynamicSentinel`\<\{ `await_task`: `ToolDefinition`\<\{ `task_id`: `string`; `wait_ms?`: `number`; \}, \{ `elapsedMs`: `number`; `label`: `string`; `result`: `unknown`; `status`: `"running"` \| `"done"` \| `"error"` \| `"lost"`; `task_id`: `string`; `tool`: `string`; \} \| \{ `elapsedMs`: `number`; `error`: `string`; `label`: `string`; `status`: `"running"` \| `"done"` \| `"error"` \| `"lost"`; `task_id`: `string`; `tool`: `string`; \} \| \{ `elapsedMs`: `number`; `label`: `string`; `progress?`: \{ \} \| `null`; `status`: `"running"` \| `"done"` \| `"error"` \| `"lost"`; `task_id`: `string`; `tool`: `string`; \}\>; `check_tasks`: `ToolDefinition`\<`Record`\<`string`, `never`\>, \{ `runningCount`: `number`; `tasks`: `object`[]; \}\>; `run_async`: `ToolDefinition`\<\{ `input`: `Record`\<`string`, `unknown`\>; `tool`: `string`; \}, \{ `note`: `string`; `status`: `"running"`; `task_id`: `string`; `tool`: `string`; \}\>; \} \| `null`\>

Defined in: [packages/agent-sdk/src/tools/tasks.ts:161](https://github.com/zocomputer/zov2-code/blob/ea094c0d7d3efd4351c48b5c1bd38d95a1836e8d/packages/agent-sdk/src/tools/tasks.ts#L161)

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

`DynamicSentinel`\<\{ `await_task`: `ToolDefinition`\<\{ `task_id`: `string`; `wait_ms?`: `number`; \}, \{ `elapsedMs`: `number`; `label`: `string`; `result`: `unknown`; `status`: `"running"` \| `"done"` \| `"error"` \| `"lost"`; `task_id`: `string`; `tool`: `string`; \} \| \{ `elapsedMs`: `number`; `error`: `string`; `label`: `string`; `status`: `"running"` \| `"done"` \| `"error"` \| `"lost"`; `task_id`: `string`; `tool`: `string`; \} \| \{ `elapsedMs`: `number`; `label`: `string`; `progress?`: \{ \} \| `null`; `status`: `"running"` \| `"done"` \| `"error"` \| `"lost"`; `task_id`: `string`; `tool`: `string`; \}\>; `check_tasks`: `ToolDefinition`\<`Record`\<`string`, `never`\>, \{ `runningCount`: `number`; `tasks`: `object`[]; \}\>; `run_async`: `ToolDefinition`\<\{ `input`: `Record`\<`string`, `unknown`\>; `tool`: `string`; \}, \{ `note`: `string`; `status`: `"running"`; `task_id`: `string`; `tool`: `string`; \}\>; \} \| `null`\>
