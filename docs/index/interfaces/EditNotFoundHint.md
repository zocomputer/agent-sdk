[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / EditNotFoundHint

# Interface: EditNotFoundHint

Defined in: [packages/agent-sdk/src/edit-match.ts:574](https://github.com/zocomputer/zov2-code/blob/f537e0a90da222390e69bcbf7e329142b9e8d4b0/packages/agent-sdk/src/edit-match.ts#L574)

The closest-match hint appended to a not-found edit error.

## Properties

### line

> **line**: `number`

Defined in: [packages/agent-sdk/src/edit-match.ts:576](https://github.com/zocomputer/zov2-code/blob/f537e0a90da222390e69bcbf7e329142b9e8d4b0/packages/agent-sdk/src/edit-match.ts#L576)

1-based line number of the closest matching line.

***

### preview

> **preview**: `string`

Defined in: [packages/agent-sdk/src/edit-match.ts:578](https://github.com/zocomputer/zov2-code/blob/f537e0a90da222390e69bcbf7e329142b9e8d4b0/packages/agent-sdk/src/edit-match.ts#L578)

Line-numbered window around the closest match (`read`-style `N|text`).
