[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createTodoTool

# Function: createTodoTool()

> **createTodoTool**(`opts?`): `ToolDefinition`

Defined in: [packages/agent-sdk/src/tools/todo.ts:38](https://github.com/zocomputer/zov2-code/blob/fc4b6dd8dd680b4495b1f44b776f9a8d76104d40/packages/agent-sdk/src/tools/todo.ts#L38)

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
