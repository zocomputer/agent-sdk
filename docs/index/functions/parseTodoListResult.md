[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / parseTodoListResult

# Function: parseTodoListResult()

> **parseTodoListResult**(`value`): readonly [`TodoItem`](../interfaces/TodoItem.md)[] \| `null`

Defined in: [packages/agent-sdk/src/todo-discipline.ts:77](https://github.com/zocomputer/zov2-code/blob/561b0153afcd985ff89c43386656aa6cb1d2502e/packages/agent-sdk/src/todo-discipline.ts#L77)

Parse eve's todo tool result (`{ counts, todos }`) down to its item list.
Returns `null` when the shape doesn't match — the wrapper then skips the
stateful check rather than bricking the tool on a result-shape change.

## Parameters

### value

`unknown`

## Returns

readonly [`TodoItem`](../interfaces/TodoItem.md)[] \| `null`
