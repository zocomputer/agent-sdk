[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SheetExtraction

# Type Alias: SheetExtraction

> **SheetExtraction** = \{ `ok`: `true`; `sheets`: readonly [`SheetMeta`](../interfaces/SheetMeta.md)[]; `text`: `string`; \} \| \{ `ok`: `false`; `reason`: `string`; \}

Defined in: [packages/agent-sdk/src/extract/sheet.ts:23](https://github.com/zocomputer/zov2-code/blob/d15edc03b49c31d0244c34c64095ce9b88216fe1/packages/agent-sdk/src/extract/sheet.ts#L23)

Result of spreadsheet extraction: either TSV text under explicit sheet
markers plus metadata for each sheet, or a failure reason.
