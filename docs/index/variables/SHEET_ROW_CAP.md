[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SHEET\_ROW\_CAP

# Variable: SHEET\_ROW\_CAP

> `const` **SHEET\_ROW\_CAP**: `5000` = `5_000`

Defined in: [packages/agent-sdk/src/extract/sheet.ts:31](https://github.com/zocomputer/zov2-code/blob/b1083703742c40f0a33149c0d589f9948d72aea2/packages/agent-sdk/src/extract/sheet.ts#L31)

Per-sheet row cap. The 50 KB view budget usually bites first; this keeps a
pathological million-row sheet from being TSV-serialized at all.
