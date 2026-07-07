[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / extractSheets

# Function: extractSheets()

> **extractSheets**(`buffer`, `rowCap?`): [`SheetExtraction`](../type-aliases/SheetExtraction.md)

Defined in: [packages/agent-sdk/src/extract/sheet.ts:38](https://github.com/zocomputer/zov2-code/blob/27ad75132e5ee857792f30c55f5617b1fdae5408/packages/agent-sdk/src/extract/sheet.ts#L38)

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
