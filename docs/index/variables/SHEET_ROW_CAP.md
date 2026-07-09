[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SHEET\_ROW\_CAP

# Variable: SHEET\_ROW\_CAP

> `const` **SHEET\_ROW\_CAP**: `5000` = `5_000`

Defined in: [packages/agent-sdk/src/extract/sheet.ts:31](https://github.com/zocomputer/zov2-code/blob/8718aaa2765d9af21ff0cbb162dec35286dbcb11/packages/agent-sdk/src/extract/sheet.ts#L31)

Per-sheet row cap. The 50 KB view budget usually bites first; this keeps a
pathological million-row sheet from being TSV-serialized at all.
