[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / DocxExtraction

# Type Alias: DocxExtraction

> **DocxExtraction** = \{ `ok`: `true`; `text`: `string`; \} \| \{ `ok`: `false`; `reason`: `string`; \}

Defined in: [packages/agent-sdk/src/extract/docx.ts:11](https://github.com/zocomputer/zov2-code/blob/492659e3281a9b9d11501446d7ec2e941b7da162/packages/agent-sdk/src/extract/docx.ts#L11)

Result of DOCX extraction: either plain text (not HTML/markdown — the model
wants the words, and read's line-numbered view supplies structure), or a
failure reason.
