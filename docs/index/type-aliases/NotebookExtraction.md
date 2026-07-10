[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / NotebookExtraction

# Type Alias: NotebookExtraction

> **NotebookExtraction** = \{ `cells`: `number`; `ok`: `true`; `text`: `string`; \} \| \{ `ok`: `false`; `reason`: `string`; \}

Defined in: [packages/agent-sdk/src/extract/ipynb.ts:12](https://github.com/zocomputer/zov2-code/blob/4567e46fc689740ed814c3b4b8b1101dff80bfbe/packages/agent-sdk/src/extract/ipynb.ts#L12)

Result of notebook extraction: text with explicit cell markers plus the
cell count, or a failure reason (malformed JSON, a pre-v4 nbformat).
