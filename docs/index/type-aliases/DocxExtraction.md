[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / DocxExtraction

# Type Alias: DocxExtraction

> **DocxExtraction** = \{ `ok`: `true`; `text`: `string`; \} \| \{ `ok`: `false`; `reason`: `string`; \}

Defined in: [packages/agent-sdk/src/extract/docx.ts:11](https://github.com/zocomputer/zov2-code/blob/311b5755d0a50f315302987e21c3a97a752a3696/packages/agent-sdk/src/extract/docx.ts#L11)

Result of DOCX extraction: either plain text (not HTML/markdown — the model
wants the words, and read's line-numbered view supplies structure), or a
failure reason.
