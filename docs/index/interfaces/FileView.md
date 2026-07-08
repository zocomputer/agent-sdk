[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / FileView

# Interface: FileView

Defined in: [packages/agent-sdk/src/file-view.ts:25](https://github.com/zocomputer/zov2-code/blob/b4029c52fbf982f223af7621dd5db23545388982/packages/agent-sdk/src/file-view.ts#L25)

A bounded, line-numbered window of a file's content: the result of applying
read's offset/limit and budget constraints. `truncated` flags when a line
was clipped or the budget stopped short; `note` guides continuation.

## Properties

### content

> `readonly` **content**: `string`

Defined in: [packages/agent-sdk/src/file-view.ts:32](https://github.com/zocomputer/zov2-code/blob/b4029c52fbf982f223af7621dd5db23545388982/packages/agent-sdk/src/file-view.ts#L32)

Line-numbered content, `NNNNNN|text` per line.

***

### endLine

> `readonly` **endLine**: `number`

Defined in: [packages/agent-sdk/src/file-view.ts:30](https://github.com/zocomputer/zov2-code/blob/b4029c52fbf982f223af7621dd5db23545388982/packages/agent-sdk/src/file-view.ts#L30)

1-based last line included; `startLine - 1` when the window is empty.

***

### note

> `readonly` **note**: `string` \| `null`

Defined in: [packages/agent-sdk/src/file-view.ts:36](https://github.com/zocomputer/zov2-code/blob/b4029c52fbf982f223af7621dd5db23545388982/packages/agent-sdk/src/file-view.ts#L36)

Continuation guidance when there is more file past `endLine`, else null.

***

### startLine

> `readonly` **startLine**: `number`

Defined in: [packages/agent-sdk/src/file-view.ts:28](https://github.com/zocomputer/zov2-code/blob/b4029c52fbf982f223af7621dd5db23545388982/packages/agent-sdk/src/file-view.ts#L28)

1-based first line of the window.

***

### totalLines

> `readonly` **totalLines**: `number`

Defined in: [packages/agent-sdk/src/file-view.ts:26](https://github.com/zocomputer/zov2-code/blob/b4029c52fbf982f223af7621dd5db23545388982/packages/agent-sdk/src/file-view.ts#L26)

***

### truncated

> `readonly` **truncated**: `boolean`

Defined in: [packages/agent-sdk/src/file-view.ts:34](https://github.com/zocomputer/zov2-code/blob/b4029c52fbf982f223af7621dd5db23545388982/packages/agent-sdk/src/file-view.ts#L34)

True when the view was cut short of the requested window (budget) or a line was clipped.
