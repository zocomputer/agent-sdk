[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / extractDocx

# Function: extractDocx()

> **extractDocx**(`buffer`): `Promise`\<[`DocxExtraction`](../type-aliases/DocxExtraction.md)\>

Defined in: [packages/agent-sdk/src/extract/docx.ts:20](https://github.com/zocomputer/zov2-code/blob/fc4b6dd8dd680b4495b1f44b776f9a8d76104d40/packages/agent-sdk/src/extract/docx.ts#L20)

Extract DOCX bytes into plain text via mammoth. Paragraph breaks are
normalized (mammoth ends every paragraph with two newlines; the trailing
run is collapsed to one).

## Parameters

### buffer

`Buffer`

## Returns

`Promise`\<[`DocxExtraction`](../type-aliases/DocxExtraction.md)\>
