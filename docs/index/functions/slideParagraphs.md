[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / slideParagraphs

# Function: slideParagraphs()

> **slideParagraphs**(`xml`): `string`[]

Defined in: [packages/agent-sdk/src/extract/pptx.ts:34](https://github.com/zocomputer/zov2-code/blob/edfd579427fbfafd3e21ca75b7f30a50695b254b/packages/agent-sdk/src/extract/pptx.ts#L34)

Collect the visible paragraphs of one slide (or notes-slide) XML part:
`a:t` runs concatenated within their `a:p` paragraph, `a:br` as a line
break. Empty paragraphs are dropped.

## Parameters

### xml

`string`

## Returns

`string`[]
