[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / extractPdf

# Function: extractPdf()

> **extractPdf**(`bytes`, `options?`): `Promise`\<[`PdfExtraction`](../type-aliases/PdfExtraction.md)\>

Defined in: [packages/agent-sdk/src/extract/pdf.ts:36](https://github.com/zocomputer/zov2-code/blob/2f680aef81cf6a147ceac91fe4d066f3e4aff1b6/packages/agent-sdk/src/extract/pdf.ts#L36)

Extract PDF bytes into text via clawpdf (PDFium compiled to WASM). Pages are
joined under explicit markers so the model can cite page numbers. Extraction
stops at `pageCap` pages; `pages` reports the true total.

## Parameters

### bytes

`Uint8Array`

### options?

#### pageCap?

`number`

## Returns

`Promise`\<[`PdfExtraction`](../type-aliases/PdfExtraction.md)\>
