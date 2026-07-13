[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SHEET\_ROW\_CAP

# Variable: SHEET\_ROW\_CAP

> `const` **SHEET\_ROW\_CAP**: `5000` = `5_000`

Defined in: [packages/agent-sdk/src/extract/sheet.ts:31](https://github.com/zocomputer/zov2-code/blob/1e24004df378afe2dca17754c9e6cedc76f36385/packages/agent-sdk/src/extract/sheet.ts#L31)

Per-sheet row cap. The 50 KB view budget usually bites first; this keeps a
pathological million-row sheet from being TSV-serialized at all.
