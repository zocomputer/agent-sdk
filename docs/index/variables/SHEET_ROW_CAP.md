[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SHEET\_ROW\_CAP

# Variable: SHEET\_ROW\_CAP

> `const` **SHEET\_ROW\_CAP**: `5000` = `5_000`

Defined in: [packages/agent-sdk/src/extract/sheet.ts:31](https://github.com/zocomputer/zov2-code/blob/ce93d09ec2812425a1522360ec5d53274fce9d8d/packages/agent-sdk/src/extract/sheet.ts#L31)

Per-sheet row cap. The 50 KB view budget usually bites first; this keeps a
pathological million-row sheet from being TSV-serialized at all.
