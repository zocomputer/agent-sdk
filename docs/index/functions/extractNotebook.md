[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / extractNotebook

# Function: extractNotebook()

> **extractNotebook**(`bytes`): [`NotebookExtraction`](../type-aliases/NotebookExtraction.md)

Defined in: [packages/agent-sdk/src/extract/ipynb.ts:85](https://github.com/zocomputer/zov2-code/blob/1e681aac14f2dac158459843dc60bdd734625bf0/packages/agent-sdk/src/extract/ipynb.ts#L85)

Extract Jupyter notebook bytes (nbformat 4) into text with per-cell
markers. Fails with a readable reason on malformed JSON or the legacy
nbformat 3 layout.

## Parameters

### bytes

`Uint8Array`

## Returns

[`NotebookExtraction`](../type-aliases/NotebookExtraction.md)
