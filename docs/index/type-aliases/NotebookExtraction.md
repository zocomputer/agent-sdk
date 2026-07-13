[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / NotebookExtraction

# Type Alias: NotebookExtraction

> **NotebookExtraction** = \{ `cells`: `number`; `ok`: `true`; `text`: `string`; \} \| \{ `ok`: `false`; `reason`: `string`; \}

Defined in: [packages/agent-sdk/src/extract/ipynb.ts:12](https://github.com/zocomputer/zov2-code/blob/fc4b6dd8dd680b4495b1f44b776f9a8d76104d40/packages/agent-sdk/src/extract/ipynb.ts#L12)

Result of notebook extraction: text with explicit cell markers plus the
cell count, or a failure reason (malformed JSON, a pre-v4 nbformat).
