[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / EpubExtraction

# Type Alias: EpubExtraction

> **EpubExtraction** = \{ `ok`: `true`; `sections`: `number`; `text`: `string`; \} \| \{ `ok`: `false`; `reason`: `string`; \}

Defined in: [packages/agent-sdk/src/extract/epub.ts:14](https://github.com/zocomputer/zov2-code/blob/09e5498b7ca8b96ad6bf74ed9ca9414f7ea0fd66/packages/agent-sdk/src/extract/epub.ts#L14)

Result of EPUB extraction: text with explicit section markers plus the
section count, or a failure reason.
