[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / parseTodoListResult

# Function: parseTodoListResult()

> **parseTodoListResult**(`value`): readonly [`TodoItem`](../interfaces/TodoItem.md)[] \| `null`

Defined in: [packages/agent-sdk/src/todo-discipline.ts:77](https://github.com/zocomputer/zov2-code/blob/c013587aa4ecd77d27b6774cf5b1fead3e0418d5/packages/agent-sdk/src/todo-discipline.ts#L77)

Parse eve's todo tool result (`{ counts, todos }`) down to its item list.
Returns `null` when the shape doesn't match — the wrapper then skips the
stateful check rather than bricking the tool on a result-shape change.

## Parameters

### value

`unknown`

## Returns

readonly [`TodoItem`](../interfaces/TodoItem.md)[] \| `null`
