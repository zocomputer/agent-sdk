[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / formatTodoViolations

# Function: formatTodoViolations()

> **formatTodoViolations**(`violations`): `string`

Defined in: [packages/agent-sdk/src/todo-discipline.ts:168](https://github.com/zocomputer/zov2-code/blob/fc4b6dd8dd680b4495b1f44b776f9a8d76104d40/packages/agent-sdk/src/todo-discipline.ts#L168)

Render violations as the rejection message the tool throws. Leads with the
fact that the list is unchanged, then one line per violation, so the model
fixes and resends the full list in one shot.

## Parameters

### violations

readonly [`TodoViolation`](../type-aliases/TodoViolation.md)[]

## Returns

`string`
