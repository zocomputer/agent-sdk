[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / formatTodoViolations

# Function: formatTodoViolations()

> **formatTodoViolations**(`violations`): `string`

Defined in: [packages/agent-sdk/src/todo-discipline.ts:168](https://github.com/zocomputer/zov2-code/blob/2f6c8cc3fd1672c6cd6d12c28dbf229ac82949b0/packages/agent-sdk/src/todo-discipline.ts#L168)

Render violations as the rejection message the tool throws. Leads with the
fact that the list is unchanged, then one line per violation, so the model
fixes and resends the full list in one shot.

## Parameters

### violations

readonly [`TodoViolation`](../type-aliases/TodoViolation.md)[]

## Returns

`string`
