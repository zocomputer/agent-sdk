[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / extractDocx

# Function: extractDocx()

> **extractDocx**(`buffer`): `Promise`\<[`DocxExtraction`](../type-aliases/DocxExtraction.md)\>

Defined in: [packages/agent-sdk/src/extract/docx.ts:20](https://github.com/zocomputer/zov2-code/blob/af9677372192b613a9430e022ed9c3a186791633/packages/agent-sdk/src/extract/docx.ts#L20)

Extract DOCX bytes into plain text via mammoth. Paragraph breaks are
normalized (mammoth ends every paragraph with two newlines; the trailing
run is collapsed to one).

## Parameters

### buffer

`Buffer`

## Returns

`Promise`\<[`DocxExtraction`](../type-aliases/DocxExtraction.md)\>
