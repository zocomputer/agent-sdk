[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / extractSheets

# Function: extractSheets()

> **extractSheets**(`buffer`, `rowCap?`): [`SheetExtraction`](../type-aliases/SheetExtraction.md)

Defined in: [packages/agent-sdk/src/extract/sheet.ts:38](https://github.com/zocomputer/zov2-code/blob/e58b3bae5fbd35c5f457130033750c9c33ee334c/packages/agent-sdk/src/extract/sheet.ts#L38)

Extract spreadsheet bytes (xlsx/xlsm/xls/ods) into TSV text under explicit
sheet markers. Cells read as computed values; each sheet is capped at
`rowCap` rows. Returns metadata for every sheet plus the full TSV text.

## Parameters

### buffer

`Buffer`

### rowCap?

`number` = `SHEET_ROW_CAP`

## Returns

[`SheetExtraction`](../type-aliases/SheetExtraction.md)
