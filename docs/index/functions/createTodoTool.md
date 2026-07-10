[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createTodoTool

# Function: createTodoTool()

> **createTodoTool**(`opts?`): `ToolDefinition`

Defined in: [packages/agent-sdk/src/tools/todo.ts:38](https://github.com/zocomputer/zov2-code/blob/384c0715e5dbd68ec5614af4167eaef9b0b6e0cd/packages/agent-sdk/src/tools/todo.ts#L38)

Build the discipline-enforcing `todo` tool: eve's framework todo (durable
state, schemas, and result shape untouched) with write validation in front —
non-empty unique contents, at most one `in_progress`, no
`pending` → `completed` jump. An invalid write throws with per-violation
guidance and leaves the list unchanged; reads and valid writes pass through.

## Parameters

### opts?

#### base?

`ToolDefinition`

The framework todo to wrap. Defaults to eve's; injectable for tests.

## Returns

`ToolDefinition`
