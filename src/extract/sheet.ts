import { read, utils } from "xlsx";

// Spreadsheet → per-sheet TSV under explicit sheet markers. SheetJS parses the
// whole family from bytes (xlsx/xlsm zip, legacy xls CFB, OpenDocument ods) —
// detection picks the family, this module never needs to know which. Cells
// read as computed values (SheetJS's default), the right answer for an agent
// reading data. TSV over CSV: tabs survive the line-numbered view better than
// quoted commas.

/**
 * Metadata for one sheet in a workbook: its name, row count, and column count.
 */
export interface SheetMeta {
  readonly name: string;
  readonly rows: number;
  readonly cols: number;
}

/**
 * Result of spreadsheet extraction: either TSV text under explicit sheet
 * markers plus metadata for each sheet, or a failure reason.
 */
export type SheetExtraction =
  | { readonly ok: true; readonly text: string; readonly sheets: readonly SheetMeta[] }
  | { readonly ok: false; readonly reason: string };

/**
 * Per-sheet row cap. The 50 KB view budget usually bites first; this keeps a
 * pathological million-row sheet from being TSV-serialized at all.
 */
export const SHEET_ROW_CAP = 5_000;

/**
 * Extract spreadsheet bytes (xlsx/xlsm/xls/ods) into TSV text under explicit
 * sheet markers. Cells read as computed values; each sheet is capped at
 * `rowCap` rows. Returns metadata for every sheet plus the full TSV text.
 */
export function extractSheets(buffer: Buffer, rowCap: number = SHEET_ROW_CAP): SheetExtraction {
  let workbook: ReturnType<typeof read>;
  try {
    workbook = read(buffer, { type: "buffer", dense: true, sheetRows: rowCap + 1 });
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
  const parts: string[] = [];
  const sheets: SheetMeta[] = [];
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (sheet === undefined) continue;
    const ref = sheet["!fullref"] ?? sheet["!ref"];
    const range = typeof ref === "string" ? utils.decode_range(ref) : null;
    const rows = range === null ? 0 : range.e.r - range.s.r + 1;
    const cols = range === null ? 0 : range.e.c - range.s.c + 1;
    sheets.push({ name, rows, cols });
    parts.push(`=== sheet "${name}" (${rows} rows x ${cols} cols) ===`);
    if (rows === 0) {
      parts.push("[empty sheet]");
      continue;
    }
    const tsv = utils.sheet_to_csv(sheet, { FS: "\t", blankrows: false }).replace(/\n+$/, "");
    const lines = tsv.split("\n");
    if (lines.length > rowCap) {
      parts.push(lines.slice(0, rowCap).join("\n"));
      parts.push(`[sheet truncated at ${rowCap} rows]`);
    } else {
      parts.push(tsv);
    }
  }
  return { ok: true, text: parts.join("\n"), sheets };
}
