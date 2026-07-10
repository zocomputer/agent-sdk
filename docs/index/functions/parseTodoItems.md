[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / parseTodoItems

# Function: parseTodoItems()

> **parseTodoItems**(`value`): readonly [`TodoItem`](../interfaces/TodoItem.md)[] \| `null`

Defined in: [packages/agent-sdk/src/todo-discipline.ts:61](https://github.com/zocomputer/zov2-code/blob/4567e46fc689740ed814c3b4b8b1101dff80bfbe/packages/agent-sdk/src/todo-discipline.ts#L61)

Parse an unknown value as a todo list (the tool input's `todos` array).
Returns `null` when the value isn't an array of well-formed items; unknown
extra keys on an item are stripped, matching the schema's strip-mode
contract.

## Parameters

### value

`unknown`

## Returns

readonly [`TodoItem`](../interfaces/TodoItem.md)[] \| `null`
