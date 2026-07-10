[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / ForgivingReplaceResult

# Interface: ForgivingReplaceResult

Defined in: [packages/agent-sdk/src/edit-match.ts:65](https://github.com/zocomputer/zov2-code/blob/ef70d86dc0c3cdb95eb7c208e5ea40a4edf9effb/packages/agent-sdk/src/edit-match.ts#L65)

A successful forgiving replacement.

## Properties

### content

> **content**: `string`

Defined in: [packages/agent-sdk/src/edit-match.ts:67](https://github.com/zocomputer/zov2-code/blob/ef70d86dc0c3cdb95eb7c208e5ea40a4edf9effb/packages/agent-sdk/src/edit-match.ts#L67)

The content after the replacement.

***

### matched

> **matched**: [`MatchStrategy`](../type-aliases/MatchStrategy.md)

Defined in: [packages/agent-sdk/src/edit-match.ts:69](https://github.com/zocomputer/zov2-code/blob/ef70d86dc0c3cdb95eb7c208e5ea40a4edf9effb/packages/agent-sdk/src/edit-match.ts#L69)

The strategy that resolved the match.

***

### replacements

> **replacements**: `number`

Defined in: [packages/agent-sdk/src/edit-match.ts:71](https://github.com/zocomputer/zov2-code/blob/ef70d86dc0c3cdb95eb7c208e5ea40a4edf9effb/packages/agent-sdk/src/edit-match.ts#L71)

How many spans were replaced (1 unless `replaceAll`).
