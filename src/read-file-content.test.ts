import { describe, expect, test } from "bun:test";
import { readFileSync, statSync } from "node:fs";
import { loadFileContent } from "./read-file-content";

function fixturePath(name: string): string {
  return new URL(`extract/fixtures/${name}`, import.meta.url).pathname;
}

function loadFixture(name: string, id?: { mtimeMs: number; size: number }) {
  const abs = fixturePath(name);
  const stat = statSync(abs);
  return loadFileContent(readFileSync(abs), name, id ?? { mtimeMs: stat.mtimeMs, size: stat.size });
}

// Corrupt-document helper: the right magic bytes followed by garbage, so
// detection routes to the extractor and the extractor must fail closed.
function corrupt(magic: string, name: string) {
  return loadFileContent(Buffer.from(`${magic} truncated garbage`, "latin1"), name, {
    mtimeMs: 1,
    size: 32,
  });
}

describe("loadFileContent", () => {
  test("plain text passes through untouched", async () => {
    const content = await loadFileContent(Buffer.from("hello\nworld\n"), "notes.txt", {
      mtimeMs: 1,
      size: 12,
    });
    expect(content).toEqual({ kind: "text", text: "hello\nworld\n" });
  });

  test("UTF-16 text decodes with the BOM stripped", async () => {
    const le = Buffer.from("\uFEFFname,count\nrésumé,1\n", "utf16le");
    const leContent = await loadFileContent(le, "export.csv", { mtimeMs: 1, size: le.length });
    expect(leContent).toEqual({ kind: "text", text: "name,count\nrésumé,1\n" });
    const be = Buffer.from(le).swap16();
    const beContent = await loadFileContent(be, "export.csv", { mtimeMs: 1, size: be.length });
    expect(beContent).toEqual({ kind: "text", text: "name,count\nrésumé,1\n" });
  });

  test("routes PDF to extraction with a page count", async () => {
    const content = await loadFixture("two-page.pdf");
    if (content.kind !== "pdf") throw new Error(`expected pdf, got ${content.kind}`);
    expect(content.pages).toBe(2);
    expect(content.text).toContain("=== page 1 of 2 ===");
  });

  test("routes DOCX to extraction", async () => {
    const content = await loadFixture("sample.docx");
    if (content.kind !== "docx") throw new Error(`expected docx, got ${content.kind}`);
    expect(content.text).toContain("Rib reads Word documents now.");
  });

  test("routes XLSX to sheet extraction with metadata", async () => {
    const content = await loadFixture("two-sheet.xlsx");
    if (content.kind !== "sheet") throw new Error(`expected sheet, got ${content.kind}`);
    expect(content.format).toBe("xlsx");
    expect(content.sheets.map((s) => s.name)).toEqual(["Fruit", "Totals"]);
    expect(content.text).toContain("apple\t3");
  });

  test("images return metadata, not text", async () => {
    const content = await loadFixture("tiny.png");
    if (content.kind !== "image") throw new Error(`expected image, got ${content.kind}`);
    expect(content.format).toBe("png");
    expect(content.width).toBeGreaterThan(0);
    expect(content.height).toBeGreaterThan(0);
  });

  test("opaque binaries throw the text-only error", async () => {
    expect(loadFixture("sample.zip")).rejects.toThrow(/read returns text only/);
  });

  test("named no-extractor formats throw an actionable error", async () => {
    expect(corrupt("PK\x03\x04", "deck.pptx")).rejects.toThrow(/PowerPoint deck/);
    expect(
      corrupt("\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1", "memo.doc"),
    ).rejects.toThrow(/convert it to \.docx/);
  });

  test("corrupt documents throw the extraction error, not garbage output", async () => {
    expect(corrupt("%PDF-", "broken.pdf")).rejects.toThrow(/Could not extract text from PDF/);
    expect(corrupt("PK\x03\x04", "broken.docx")).rejects.toThrow(
      /Could not extract text from DOCX/,
    );
    expect(corrupt("PK\x03\x04", "broken.xlsx")).rejects.toThrow(
      /Could not extract data from spreadsheet/,
    );
  });

  test("extraction is cached by path + stat identity", async () => {
    const id = { mtimeMs: 42, size: statSync(fixturePath("two-page.pdf")).size };
    const first = await loadFixture("two-page.pdf", id);
    const second = await loadFixture("two-page.pdf", id);
    // Same object back means PDFium didn't run again.
    expect(second).toBe(first);
    const changed = await loadFixture("two-page.pdf", { ...id, mtimeMs: 43 });
    expect(changed).not.toBe(first);
  });
});
