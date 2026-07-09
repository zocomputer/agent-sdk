[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / NotebookExtraction

# Type Alias: NotebookExtraction

> **NotebookExtraction** = \{ `cells`: `number`; `ok`: `true`; `text`: `string`; \} \| \{ `ok`: `false`; `reason`: `string`; \}

Defined in: [packages/agent-sdk/src/extract/ipynb.ts:12](https://github.com/zocomputer/zov2-code/blob/edfd579427fbfafd3e21ca75b7f30a50695b254b/packages/agent-sdk/src/extract/ipynb.ts#L12)

Result of notebook extraction: text with explicit cell markers plus the
cell count, or a failure reason (malformed JSON, a pre-v4 nbformat).
