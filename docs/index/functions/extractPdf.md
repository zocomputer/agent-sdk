[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / extractPdf

# Function: extractPdf()

> **extractPdf**(`bytes`, `options?`): `Promise`\<[`PdfExtraction`](../type-aliases/PdfExtraction.md)\>

Defined in: [packages/agent-sdk/src/extract/pdf.ts:36](https://github.com/zocomputer/zov2-code/blob/4567e46fc689740ed814c3b4b8b1101dff80bfbe/packages/agent-sdk/src/extract/pdf.ts#L36)

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
