[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / PdfExtraction

# Type Alias: PdfExtraction

> **PdfExtraction** = \{ `ok`: `true`; `pages`: `number`; `text`: `string`; \} \| \{ `ok`: `false`; `reason`: `string`; \}

Defined in: [packages/agent-sdk/src/extract/pdf.ts:12](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/extract/pdf.ts#L12)

Result of PDF extraction: either text with explicit page markers plus the
true page count (which may exceed extracted pages if the cap bit), or a
failure reason.
