[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / PptxExtraction

# Type Alias: PptxExtraction

> **PptxExtraction** = \{ `ok`: `true`; `slides`: `number`; `text`: `string`; \} \| \{ `ok`: `false`; `reason`: `string`; \}

Defined in: [packages/agent-sdk/src/extract/pptx.ts:15](https://github.com/zocomputer/zov2-code/blob/f60be6793ffd6089caaf80014c136f326348f4b1/packages/agent-sdk/src/extract/pptx.ts#L15)

Result of PPTX extraction: text with explicit slide markers plus the true
slide count (which may exceed extracted slides if the cap bit), or a
failure reason.
