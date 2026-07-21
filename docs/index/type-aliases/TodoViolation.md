[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / TodoViolation

# Type Alias: TodoViolation

> **TodoViolation** = \{ `index`: `number`; `kind`: `"empty_content"`; \} \| \{ `content`: `string`; `kind`: `"duplicate_content"`; \} \| \{ `contents`: readonly `string`[]; `kind`: `"multiple_in_progress"`; \} \| \{ `content`: `string`; `kind`: `"pending_completed_jump"`; \}

Defined in: [packages/agent-sdk/src/todo-discipline.ts:83](https://github.com/zocomputer/zov2-code/blob/3530b39a94e929be74c3d9202bace84f47b21b44/packages/agent-sdk/src/todo-discipline.ts#L83)

One discipline violation found in a todo write.

## Union Members

### Type Literal

\{ `index`: `number`; `kind`: `"empty_content"`; \}

An item's content is empty (or whitespace-only).

***

### Type Literal

\{ `content`: `string`; `kind`: `"duplicate_content"`; \}

Two or more items share the same (trimmed) content.

***

### Type Literal

\{ `contents`: readonly `string`[]; `kind`: `"multiple_in_progress"`; \}

More than one item is in_progress.

***

### Type Literal

\{ `content`: `string`; `kind`: `"pending_completed_jump"`; \}

An item tracked as pending in the previous list jumped straight to completed.
