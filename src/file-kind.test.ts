import { describe, expect, test } from "bun:test";
import { audioMediaType, detectFileKind, videoMediaType } from "./file-kind";

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

  test("RIFF disambiguates by payload tag", () => {
    const wav = Buffer.concat([Buffer.from("RIFF"), Buffer.from([4, 0, 0, 0]), Buffer.from("WAVE")]);
    expect(detectFileKind(wav, "a.wav")).toEqual({ kind: "audio", format: "wav" });
    const avi = Buffer.concat([Buffer.from("RIFF"), Buffer.from([4, 0, 0, 0]), Buffer.from("AVI ")]);
    expect(detectFileKind(avi, "a.avi")).toEqual({ kind: "video", format: "avi" });
    const other = Buffer.concat([
      Buffer.from("RIFF"),
      Buffer.from([4, 0, 0, 0]),
      Buffer.from("ACON"),
    ]);
    expect(detectFileKind(other, "cursor.ani").kind).toBe("binary");
  });

  test("ISO BMFF (ftyp) routes by major brand", () => {
    const bmff = (brand: string) =>
      Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftyp"), Buffer.from(brand), Buffer.alloc(8)]);
    expect(detectFileKind(bmff("isom"), "clip.mp4")).toEqual({ kind: "video", format: "mp4" });
    expect(detectFileKind(bmff("mp42"), "renamed.bin")).toEqual({ kind: "video", format: "mp4" });
    expect(detectFileKind(bmff("qt  "), "clip.mov")).toEqual({ kind: "video", format: "mov" });
    expect(detectFileKind(bmff("M4A "), "song.m4a")).toEqual({ kind: "audio", format: "m4a" });
    const heic = detectFileKind(bmff("heic"), "photo.heic");
    if (heic.kind !== "binary") throw new Error(`expected binary, got ${heic.kind}`);
    expect(heic.description).toContain("HEIF/AVIF");
    const avif = detectFileKind(bmff("avif"), "photo.avif");
    expect(avif.kind).toBe("binary");
  });

  test("BMFF audio detection reads compatible brands and the extension", () => {
    // Real .m4a files often carry a generic major brand with `M4A ` only in
    // the compatible-brands list (box size 0x20 = 16-byte header + 4 brands).
    const withCompat = Buffer.concat([
      Buffer.from([0, 0, 0, 0x20]),
      Buffer.from("ftyp"),
      Buffer.from("isom"), // major
      Buffer.alloc(4), // minor version
      Buffer.from("isom"),
      Buffer.from("iso2"),
      Buffer.from("M4A "),
      Buffer.from("mp41"),
    ]);
    expect(detectFileKind(withCompat, "renamed.bin")).toEqual({ kind: "audio", format: "m4a" });

    // No audio brand anywhere: the .m4a extension is the tiebreak…
    const generic = (name: string) =>
      detectFileKind(
        Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypisom"), Buffer.alloc(12)]),
        name,
      );
    expect(generic("voice-memo.m4a")).toEqual({ kind: "audio", format: "m4a" });
    expect(generic("audiobook.m4b")).toEqual({ kind: "audio", format: "m4a" });
    // …and without it, a generic container stays video.
    expect(generic("clip.mp4")).toEqual({ kind: "video", format: "mp4" });

    // A corrupt/huge declared box size must not scan past the cap or throw.
    const corrupt = Buffer.concat([
      Buffer.from([0x7f, 0xff, 0xff, 0xff]),
      Buffer.from("ftypisom"),
      Buffer.alloc(20),
    ]);
    expect(detectFileKind(corrupt, "clip.mp4").kind).toBe("video");
  });

  test("BMFF image detection reads compatible brands too", () => {
    // HEIC commonly ships major `mif1` (already an image brand), but some
    // encoders bury `heic` in the compatible list behind a generic major.
    const withCompat = Buffer.concat([
      Buffer.from([0, 0, 0, 0x1c]),
      Buffer.from("ftyp"),
      Buffer.from("isom"), // generic major
      Buffer.alloc(4), // minor version
      Buffer.from("mif1"),
      Buffer.from("heic"),
    ]);
    const detected = detectFileKind(withCompat, "photo.heic");
    if (detected.kind !== "binary") throw new Error(`expected binary, got ${detected.kind}`);
    expect(detected.description).toContain("HEIF/AVIF");
  });

  test("EBML routes WebM vs Matroska by DocType", () => {
    const ebml = (docType: string) =>
      Buffer.concat([
        Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01]),
        Buffer.from(docType),
        Buffer.alloc(16),
      ]);
    expect(detectFileKind(ebml("B\x82\x84webm"), "clip.webm")).toEqual({
      kind: "video",
      format: "webm",
    });
    expect(detectFileKind(ebml("B\x82\x88matroska"), "clip.mkv")).toEqual({
      kind: "video",
      format: "mkv",
    });
  });

  test("audio formats by magic", () => {
    expect(detectFileKind(Buffer.from("ID3\x04\x00binarytag"), "song.mp3")).toEqual({
      kind: "audio",
      format: "mp3",
    });
    expect(detectFileKind(Buffer.from("OggS\x00\x02"), "voice.ogg")).toEqual({
      kind: "audio",
      format: "ogg",
    });
    expect(detectFileKind(Buffer.from("fLaC\x00\x00\x00"), "track.flac")).toEqual({
      kind: "audio",
      format: "flac",
    });
  });

  test("a bare MPEG frame sync needs the .mp3 extension to agree", () => {
    const frame = Buffer.from([0xff, 0xfb, 0x90, 0x00, 0x00]);
    expect(detectFileKind(frame, "song.mp3")).toEqual({ kind: "audio", format: "mp3" });
    // Same bytes without the extension stay binary (too weak a signature).
    expect(detectFileKind(frame, "blob.dat").kind).toBe("binary");
  });

  test("zip magic disambiguates by extension", () => {
    expect(detectFileKind(zip, "report.docx")).toEqual({ kind: "docx" });
    expect(detectFileKind(zip, "Data.XLSX")).toEqual({ kind: "sheet", format: "xlsx" });
    expect(detectFileKind(zip, "macros.xlsm")).toEqual({ kind: "sheet", format: "xlsm" });
    expect(detectFileKind(zip, "table.ods")).toEqual({ kind: "sheet", format: "ods" });
    expect(detectFileKind(zip, "deck.pptx")).toEqual({ kind: "pptx" });
    expect(detectFileKind(zip, "letter.odt")).toEqual({ kind: "odt" });
    expect(detectFileKind(zip, "slides.odp")).toEqual({ kind: "odp" });
    expect(detectFileKind(zip, "book.epub")).toEqual({ kind: "epub" });
    expect(detectFileKind(zip, "bundle.zip")).toEqual({
      kind: "binary",
      description: "a zip archive",
    });
  });

  test("RTF by magic, regardless of extension", () => {
    const rtf = Buffer.from("{\\rtf1\\ansi Hello}");
    expect(detectFileKind(rtf, "memo.rtf")).toEqual({ kind: "rtf" });
    expect(detectFileKind(rtf, "renamed.txt")).toEqual({ kind: "rtf" });
    // An .rtf without the header is just text.
    expect(detectFileKind(Buffer.from("plain words"), "memo.rtf")).toEqual(utf8Text);
  });

  test("notebooks route by extension over text bytes", () => {
    expect(detectFileKind(Buffer.from('{"cells": []}'), "analysis.ipynb")).toEqual({
      kind: "ipynb",
    });
    // The same JSON without the extension stays plain text…
    expect(detectFileKind(Buffer.from('{"cells": []}'), "analysis.json")).toEqual(utf8Text);
    // …and a binary .ipynb is binary, not a notebook.
    expect(detectFileKind(Buffer.from([0x61, 0x00, 0x62]), "fake.ipynb").kind).toBe("binary");
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

describe("media type mapping", () => {
  test("video formats map to their MIME types", () => {
    expect(videoMediaType("mp4")).toBe("video/mp4");
    expect(videoMediaType("mov")).toBe("video/quicktime");
    expect(videoMediaType("webm")).toBe("video/webm");
    expect(videoMediaType("mkv")).toBe("video/x-matroska");
    expect(videoMediaType("avi")).toBe("video/x-msvideo");
  });

  test("audio formats map to their MIME types", () => {
    expect(audioMediaType("mp3")).toBe("audio/mpeg");
    expect(audioMediaType("wav")).toBe("audio/wav");
    expect(audioMediaType("ogg")).toBe("audio/ogg");
    expect(audioMediaType("flac")).toBe("audio/flac");
    expect(audioMediaType("m4a")).toBe("audio/mp4");
  });
});
