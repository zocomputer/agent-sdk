[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / PptxExtraction

# Type Alias: PptxExtraction

> **PptxExtraction** = \{ `ok`: `true`; `slides`: `number`; `text`: `string`; \} \| \{ `ok`: `false`; `reason`: `string`; \}

Defined in: [packages/agent-sdk/src/extract/pptx.ts:15](https://github.com/zocomputer/zov2-code/blob/8718aaa2765d9af21ff0cbb162dec35286dbcb11/packages/agent-sdk/src/extract/pptx.ts#L15)

Result of PPTX extraction: text with explicit slide markers plus the true
slide count (which may exceed extracted slides if the cap bit), or a
failure reason.
