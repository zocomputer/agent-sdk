[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / validateTodoWrite

# Function: validateTodoWrite()

> **validateTodoWrite**(`args`): readonly [`TodoViolation`](../type-aliases/TodoViolation.md)[]

Defined in: [packages/agent-sdk/src/todo-discipline.ts:100](https://github.com/zocomputer/zov2-code/blob/9d3f4b0b6ac2b9a8a8d1307a4590af07d0d7978f/packages/agent-sdk/src/todo-discipline.ts#L100)

Validate a full-replacement todo write against the discipline rules:
non-empty unique contents, at most one `in_progress`, and no
`pending` → `completed` jump for an item carried over from the previous
list (`previous: null` skips the stateful rule — better an unchecked write
than a bricked tool when the prior state can't be read).

## Parameters

### args

#### next

readonly [`TodoItem`](../interfaces/TodoItem.md)[]

#### previous

readonly [`TodoItem`](../interfaces/TodoItem.md)[] \| `null`

## Returns

readonly [`TodoViolation`](../type-aliases/TodoViolation.md)[]
