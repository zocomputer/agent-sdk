import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { deflateRawSync } from "node:zlib";
import { extractEpub, xhtmlToText } from "./epub";

const fixture = (name: string) => new URL(`fixtures/${name}`, import.meta.url).pathname;

describe("xhtmlToText", () => {
  test("block tags break lines; inline tags do not", () => {
    expect(xhtmlToText("<p>one <b>bold</b></p><p>two</p>")).toBe("one bold\ntwo");
  });

  test("script, style, and head content is dropped", () => {
    const html =
      "<html><head><title>skip</title><style>p{}</style></head>" +
      "<body><script>var x = 1;</script><p>kept</p></body></html>";
    expect(xhtmlToText(html)).toBe("kept");
  });

  test("blank lines collapse", () => {
    expect(xhtmlToText("<div><p>a</p><br/><br/><p>b</p></div>")).toBe("a\nb");
  });
});

describe("extractEpub", () => {
  test("extracts sections in spine order, not entry-name order", () => {
    const result = extractEpub(readFileSync(fixture("one-chapter.epub")));
    if (!result.ok) throw new Error(result.reason);
    expect(result.sections).toBe(2);
    // The spine puts b-intro.xhtml before a-end.xhtml; alphabetical order
    // would reverse them.
    expect(result.text).toContain("=== section 1 of 2 (OEBPS/b-intro.xhtml) ===");
    expect(result.text).toContain("=== section 2 of 2 (OEBPS/a-end.xhtml) ===");
    expect(result.text.indexOf("Once upon a time.")).toBeLessThan(
      result.text.indexOf("The end."),
    );
  });

  test("styles and CSS entries never leak into the text", () => {
    const result = extractEpub(readFileSync(fixture("one-chapter.epub")));
    if (!result.ok) throw new Error(result.reason);
    expect(result.text).not.toContain("color: red");
  });

  test("the section cap bounds extraction and reports the true total", () => {
    const result = extractEpub(readFileSync(fixture("one-chapter.epub")), { sectionCap: 1 });
    if (!result.ok) throw new Error(result.reason);
    expect(result.sections).toBe(2);
    expect(result.text).toContain("=== section 1 of 2");
    expect(result.text).not.toContain("The end.");
    expect(result.text).toContain("1 of 2 sections extracted");
  });

  test("falls back to (x)html entries when package metadata is missing", () => {
    // A bare zip of chapters with no container.xml/OPF still reads.
    const entries: [string, string][] = [
      ["ch1.xhtml", "<html><body><p>fallback chapter</p></body></html>"],
    ];
    const zip = buildZip(entries);
    const result = extractEpub(zip);
    if (!result.ok) throw new Error(result.reason);
    expect(result.text).toContain("fallback chapter");
  });

  test("a zip with no readable sections fails closed with a reason", () => {
    const result = extractEpub(readFileSync(fixture("sample.zip")));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toContain("EPUB");
  });

  test("non-zip bytes fail closed", () => {
    const result = extractEpub(Buffer.from("plain text, definitely not a zip archive here"));
    expect(result.ok).toBe(false);
  });
});

// Minimal in-test zip builder (deflate every entry) for fallback-path cases
// the checked-in fixtures don't cover.
function buildZip(entries: [string, string][]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of entries) {
    const nameBytes = Buffer.from(name, "utf8");
    const data = deflateRawSync(Buffer.from(text, "utf8"));
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(text.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    const record = Buffer.concat([local, nameBytes, data]);
    locals.push(record);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(text.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(Buffer.concat([central, nameBytes]));
    offset += record.length;
  }
  const centralBlock = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBlock.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBlock, eocd]);
}
