import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { utils, write } from "xlsx";
import { extractSheets } from "./sheet";

const fixture = new URL("fixtures/two-sheet.xlsx", import.meta.url).pathname;

// In-memory round-trips for the non-xlsx family members: SheetJS writes the
// format, extractSheets reads it back — no binary fixtures needed.
function workbookBytes(bookType: "biff8" | "ods"): Buffer {
  const wb = utils.book_new();
  const ws = utils.aoa_to_sheet([
    ["fruit", "count"],
    ["apple", 3],
    ["banana", 5],
  ]);
  utils.book_append_sheet(wb, ws, "Fruit");
  const bytes: unknown = write(wb, { type: "buffer", bookType });
  if (!Buffer.isBuffer(bytes)) throw new Error("expected SheetJS write to return a Buffer");
  return bytes;
}

describe("extractSheets", () => {
  test("extracts per-sheet TSV under sheet markers", () => {
    const result = extractSheets(readFileSync(fixture));
    if (!result.ok) throw new Error(result.reason);
    expect(result.text).toContain('=== sheet "Fruit" (4 rows x 2 cols) ===');
    expect(result.text).toContain("fruit\tcount");
    expect(result.text).toContain("apple\t3");
    expect(result.text).toContain("cherry\t12");
    expect(result.text).toContain('=== sheet "Totals" (1 rows x 2 cols) ===');
    expect(result.text).toContain("total\t20");
    expect(result.sheets).toEqual([
      { name: "Fruit", rows: 4, cols: 2 },
      { name: "Totals", rows: 1, cols: 2 },
    ]);
  });

  test("a small row cap truncates with a marker", () => {
    const result = extractSheets(readFileSync(fixture), 2);
    if (!result.ok) throw new Error(result.reason);
    expect(result.text).toContain("[sheet truncated at 2 rows]");
    expect(result.text).toContain("apple\t3");
    expect(result.text).not.toContain("cherry\t12");
  });

  test("legacy .xls (BIFF8/CFB) parses like xlsx", () => {
    const result = extractSheets(workbookBytes("biff8"));
    if (!result.ok) throw new Error(result.reason);
    expect(result.text).toContain('=== sheet "Fruit" (3 rows x 2 cols) ===');
    expect(result.text).toContain("apple\t3");
    expect(result.text).toContain("banana\t5");
  });

  test("OpenDocument .ods parses like xlsx", () => {
    const result = extractSheets(workbookBytes("ods"));
    if (!result.ok) throw new Error(result.reason);
    expect(result.text).toContain('=== sheet "Fruit" (3 rows x 2 cols) ===');
    expect(result.text).toContain("apple\t3");
    expect(result.text).toContain("banana\t5");
  });

  // Plain text won't hit this path (SheetJS would happily parse it as CSV):
  // detectFileKind routes here only for zip/CFB-magic bytes, so a corrupt
  // container is the realistic failure.
  test("corrupt zip bytes fail closed with a reason", () => {
    const result = extractSheets(Buffer.from("PK\x03\x04 truncated garbage"));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason.length).toBeGreaterThan(0);
  });
});
