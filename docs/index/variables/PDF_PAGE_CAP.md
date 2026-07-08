[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / PDF\_PAGE\_CAP

# Variable: PDF\_PAGE\_CAP

> `const` **PDF\_PAGE\_CAP**: `200` = `200`

Defined in: [packages/agent-sdk/src/extract/pdf.ts:29](https://github.com/zocomputer/zov2-code/blob/1e3454bf19fec73047afd6e825710b7db25d004a/packages/agent-sdk/src/extract/pdf.ts#L29)

Extraction page cap. Read's view budget paginates the text; this bounds the
extraction work itself, so a 10,000-page PDF doesn't churn PDFium for pages
nobody asked for. `pages` still reports the true total.
