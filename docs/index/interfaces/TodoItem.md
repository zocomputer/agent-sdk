[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / TodoItem

# Interface: TodoItem

Defined in: [packages/agent-sdk/src/todo-discipline.ts:33](https://github.com/zocomputer/zov2-code/blob/431612973a5c06efcad7920699932d7fe7145ddd/packages/agent-sdk/src/todo-discipline.ts#L33)

One checklist item, mirroring eve's framework todo shape.

## Properties

### content

> `readonly` **content**: `string`

Defined in: [packages/agent-sdk/src/todo-discipline.ts:35](https://github.com/zocomputer/zov2-code/blob/431612973a5c06efcad7920699932d7fe7145ddd/packages/agent-sdk/src/todo-discipline.ts#L35)

Brief description of the task; also the item's identity across writes.

***

### priority

> `readonly` **priority**: `"low"` \| `"medium"` \| `"high"`

Defined in: [packages/agent-sdk/src/todo-discipline.ts:39](https://github.com/zocomputer/zov2-code/blob/431612973a5c06efcad7920699932d7fe7145ddd/packages/agent-sdk/src/todo-discipline.ts#L39)

Priority level.

***

### status

> `readonly` **status**: `"pending"` \| `"completed"` \| `"in_progress"` \| `"cancelled"`

Defined in: [packages/agent-sdk/src/todo-discipline.ts:37](https://github.com/zocomputer/zov2-code/blob/431612973a5c06efcad7920699932d7fe7145ddd/packages/agent-sdk/src/todo-discipline.ts#L37)

Current lifecycle status.
