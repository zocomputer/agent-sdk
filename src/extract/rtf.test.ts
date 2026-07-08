import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { extractRtf } from "./rtf";

const fixture = (name: string) => new URL(`fixtures/${name}`, import.meta.url).pathname;

function extract(rtf: string): string {
  const result = extractRtf(Buffer.from(rtf, "latin1"));
  if (!result.ok) throw new Error(result.reason);
  return result.text;
}

describe("extractRtf", () => {
  test("extracts body text from the fixture, dropping formatting words", () => {
    const result = extractRtf(readFileSync(fixture("sample.rtf")));
    if (!result.ok) throw new Error(result.reason);
    expect(result.text).toContain("Hello bold world.");
    expect(result.text).not.toContain("\\b");
    expect(result.text).not.toContain("fs24");
  });

  test("font and color tables never leak", () => {
    const result = extractRtf(readFileSync(fixture("sample.rtf")));
    if (!result.ok) throw new Error(result.reason);
    expect(result.text).not.toContain("Helvetica");
    expect(result.text).not.toContain("red0");
  });

  test("optional destinations ({\\*\\generator …}) are skipped", () => {
    const result = extractRtf(readFileSync(fixture("sample.rtf")));
    if (!result.ok) throw new Error(result.reason);
    expect(result.text).not.toContain("Fixture 1.0");
  });

  test("\\par and \\tab render as newline and tab", () => {
    const result = extractRtf(readFileSync(fixture("sample.rtf")));
    if (!result.ok) throw new Error(result.reason);
    expect(result.text).toContain(".\nSecond\ttabbed");
  });

  test("hex escapes decode as cp1252", () => {
    const result = extractRtf(readFileSync(fixture("sample.rtf")));
    if (!result.ok) throw new Error(result.reason);
    expect(result.text).toContain("café"); // \'e9
    expect(result.text).toContain("\u201cquotes\u201d"); // \'93 \'94 (cp1252 high block)
  });

  test("unicode escapes decode and consume their fallback character", () => {
    const result = extractRtf(readFileSync(fixture("sample.rtf")));
    if (!result.ok) throw new Error(result.reason);
    expect(result.text).toContain("and \u2014 dash"); // \u8212? — the "?" must not leak
    expect(result.text).not.toContain("\u2014?");
  });

  test("\\ucN controls how many fallback characters are consumed", () => {
    expect(extract("{\\rtf1\\uc2 A\\u233?? B}")).toBe("A\u00e9 B");
    // With \uc0 there is no fallback; the space after \u233 is the control
    // word's delimiter, not content.
    expect(extract("{\\rtf1\\uc0 A\\u233 B}")).toBe("A\u00e9B");
  });

  test("negative \\u params wrap into the upper BMP", () => {
    // \u-10179? style surrogates: -1 + 65536 = 65535.
    expect(extract("{\\rtf1\\uc1 \\u-1?}")).toBe("\uffff");
  });

  test("escaped braces and backslashes are literal", () => {
    expect(extract("{\\rtf1 a\\{b\\}c\\\\d}")).toBe("a{b}c\\d");
  });

  test("special character words map to their glyphs", () => {
    expect(extract("{\\rtf1 a\\emdash b\\endash c\\bullet d\\~e}")).toBe(
      "a\u2014b\u2013c\u2022d\u00a0e",
    );
  });

  test("table cells and rows render as separators", () => {
    expect(extract("{\\rtf1 one\\cell two\\cell\\row three}")).toBe("one\ttwo\t\nthree");
  });

  test("raw newlines in the source are formatting, not content", () => {
    expect(extract("{\\rtf1 one\ntwo\r\nthree}")).toBe("onetwothree");
  });

  test("control-word-dense input stays linear-time", () => {
    // ~2 MB of back-to-back control words — the quadratic slice-per-
    // backslash regression took minutes here; linear scanning takes ms.
    const body = "\\b\\i0".repeat(400_000);
    const start = performance.now();
    const result = extractRtf(Buffer.from(`{\\rtf1${body} done}`, "latin1"));
    const elapsed = performance.now() - start;
    if (!result.ok) throw new Error(result.reason);
    // The space after the last control word is its delimiter, not content.
    expect(result.text).toBe("done");
    expect(elapsed).toBeLessThan(2_000);
  });

  test("bytes without the {\\rtf header fail closed", () => {
    const result = extractRtf(Buffer.from("plain text"));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toContain("{\\rtf");
  });
});
