[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SheetExtraction

# Type Alias: SheetExtraction

> **SheetExtraction** = \{ `ok`: `true`; `sheets`: readonly [`SheetMeta`](../interfaces/SheetMeta.md)[]; `text`: `string`; \} \| \{ `ok`: `false`; `reason`: `string`; \}

Defined in: [packages/agent-sdk/src/extract/sheet.ts:23](https://github.com/zocomputer/zov2-code/blob/492659e3281a9b9d11501446d7ec2e941b7da162/packages/agent-sdk/src/extract/sheet.ts#L23)

Result of spreadsheet extraction: either TSV text under explicit sheet
markers plus metadata for each sheet, or a failure reason.
