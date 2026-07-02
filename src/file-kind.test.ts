import { describe, expect, test } from "bun:test";
import { detectFileKind } from "./file-kind";

const pdf = Buffer.from("%PDF-1.4\n1 0 obj");
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const gif = Buffer.from("GIF89a\x01\x00", "latin1");
const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.from([4, 0, 0, 0]), Buffer.from("WEBP")]);
const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
const cfb = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00]);
const utf8Text = { kind: "text", encoding: "utf8" } as const;

describe("detectFileKind", () => {
  test("pdf by magic, regardless of extension", () => {
    expect(detectFileKind(pdf, "doc.pdf")).toEqual({ kind: "pdf" });
    expect(detectFileKind(pdf, "renamed.txt")).toEqual({ kind: "pdf" });
  });

  test("image formats by magic", () => {
    expect(detectFileKind(png, "a.png")).toEqual({ kind: "image", format: "png" });
    expect(detectFileKind(jpeg, "a.jpg")).toEqual({ kind: "image", format: "jpeg" });
    expect(detectFileKind(gif, "a.gif")).toEqual({ kind: "image", format: "gif" });
    expect(detectFileKind(webp, "a.webp")).toEqual({ kind: "image", format: "webp" });
  });

  test("RIFF that is not WEBP is not an image", () => {
    const wav = Buffer.concat([Buffer.from("RIFF"), Buffer.from([4, 0, 0, 0]), Buffer.from("WAVE")]);
    expect(detectFileKind(wav, "a.wav").kind).toBe("binary");
  });

  test("zip magic disambiguates by extension", () => {
    expect(detectFileKind(zip, "report.docx")).toEqual({ kind: "docx" });
    expect(detectFileKind(zip, "Data.XLSX")).toEqual({ kind: "sheet", format: "xlsx" });
    expect(detectFileKind(zip, "macros.xlsm")).toEqual({ kind: "sheet", format: "xlsm" });
    expect(detectFileKind(zip, "table.ods")).toEqual({ kind: "sheet", format: "ods" });
    expect(detectFileKind(zip, "bundle.zip")).toEqual({
      kind: "binary",
      description: "a zip archive",
    });
  });

  test("zip formats with no extractor are rejected by name", () => {
    const pptx = detectFileKind(zip, "deck.pptx");
    if (pptx.kind !== "binary") throw new Error(`expected binary, got ${pptx.kind}`);
    expect(pptx.description).toContain(".pptx");
    const odt = detectFileKind(zip, "letter.odt");
    if (odt.kind !== "binary") throw new Error(`expected binary, got ${odt.kind}`);
    expect(odt.description).toContain(".odt");
    const epub = detectFileKind(zip, "book.epub");
    if (epub.kind !== "binary") throw new Error(`expected binary, got ${epub.kind}`);
    expect(epub.description).toContain("EPUB");
  });

  test("CFB magic disambiguates legacy Office by extension", () => {
    expect(detectFileKind(cfb, "old.xls")).toEqual({ kind: "sheet", format: "xls" });
    const doc = detectFileKind(cfb, "memo.doc");
    if (doc.kind !== "binary") throw new Error(`expected binary, got ${doc.kind}`);
    expect(doc.description).toContain("convert it to .docx");
    const ppt = detectFileKind(cfb, "deck.ppt");
    if (ppt.kind !== "binary") throw new Error(`expected binary, got ${ppt.kind}`);
    expect(ppt.description).toContain("convert it to .pptx");
    expect(detectFileKind(cfb, "mystery.bin")).toEqual({
      kind: "binary",
      description: "a legacy Office (CFB) container",
    });
  });

  test("extension lying about content loses to the bytes", () => {
    // A "pdf" that is actually plain text reads as text.
    expect(detectFileKind(Buffer.from("just words\n"), "fake.pdf")).toEqual(utf8Text);
    // A "docx" with no zip magic is not a docx.
    expect(detectFileKind(Buffer.from("not a zip"), "fake.docx")).toEqual(utf8Text);
  });

  test("UTF-16 BOMs read as text despite the NUL bytes", () => {
    const le = Buffer.from("\uFEFFhi", "utf16le");
    expect(detectFileKind(le, "export.csv")).toEqual({ kind: "text", encoding: "utf16le" });
    const be = Buffer.from(le).swap16();
    expect(detectFileKind(be, "export.csv")).toEqual({ kind: "text", encoding: "utf16be" });
  });

  test("NUL byte in the first 8 KB marks binary", () => {
    expect(detectFileKind(Buffer.from([0x61, 0x00, 0x62]), "a.dat").kind).toBe("binary");
  });

  test("NUL past the sniff window still reads as text", () => {
    const buf = Buffer.concat([Buffer.alloc(8_192, 0x61), Buffer.from([0x00])]);
    expect(detectFileKind(buf, "a.log")).toEqual(utf8Text);
  });

  test("plain and empty files are text", () => {
    expect(detectFileKind(Buffer.from("hello\n"), "a.ts")).toEqual(utf8Text);
    expect(detectFileKind(Buffer.alloc(0), "empty.txt")).toEqual(utf8Text);
  });
});
