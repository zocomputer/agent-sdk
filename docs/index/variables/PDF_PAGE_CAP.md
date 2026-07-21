[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / PDF\_PAGE\_CAP

# Variable: PDF\_PAGE\_CAP

> `const` **PDF\_PAGE\_CAP**: `200` = `200`

Defined in: [packages/agent-sdk/src/extract/pdf.ts:29](https://github.com/zocomputer/zov2-code/blob/9d3f4b0b6ac2b9a8a8d1307a4590af07d0d7978f/packages/agent-sdk/src/extract/pdf.ts#L29)

Extraction page cap. Read's view budget paginates the text; this bounds the
extraction work itself, so a 10,000-page PDF doesn't churn PDFium for pages
nobody asked for. `pages` still reports the true total.
