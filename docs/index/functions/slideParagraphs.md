[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / slideParagraphs

# Function: slideParagraphs()

> **slideParagraphs**(`xml`): `string`[]

Defined in: [packages/agent-sdk/src/extract/pptx.ts:34](https://github.com/zocomputer/zov2-code/blob/a8636edc2f6184e686ebe291b26c3e5e9b3ae7ef/packages/agent-sdk/src/extract/pptx.ts#L34)

Collect the visible paragraphs of one slide (or notes-slide) XML part:
`a:t` runs concatenated within their `a:p` paragraph, `a:br` as a line
break. Empty paragraphs are dropped.

## Parameters

### xml

`string`

## Returns

`string`[]
