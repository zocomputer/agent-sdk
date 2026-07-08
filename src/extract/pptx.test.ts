import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { extractPptx, PPTX_EMPTY_SLIDE_NOTE, slideParagraphs } from "./pptx";

const fixture = (name: string) => new URL(`fixtures/${name}`, import.meta.url).pathname;

describe("slideParagraphs", () => {
  test("joins runs within a paragraph without separators", () => {
    const xml =
      "<p:sld xmlns:a='a' xmlns:p='p'><p:txBody>" +
      "<a:p><a:r><a:t>Revenue </a:t></a:r><a:r><a:t>up 12%</a:t></a:r></a:p>" +
      "</p:txBody></p:sld>";
    expect(slideParagraphs(xml)).toEqual(["Revenue up 12%"]);
  });

  test("renders a:br as a line break and drops empty paragraphs", () => {
    const xml =
      "<root><a:p><a:r><a:t>one</a:t></a:r><a:br/><a:r><a:t>two</a:t></a:r></a:p>" +
      "<a:p></a:p></root>";
    expect(slideParagraphs(xml)).toEqual(["one\ntwo"]);
  });

  test("ignores text outside a:t runs", () => {
    const xml = "<root><a:p>stray<a:r><a:t>kept</a:t></a:r></a:p></root>";
    expect(slideParagraphs(xml)).toEqual(["kept"]);
  });
});

describe("extractPptx", () => {
  test("extracts slides in order under slide markers", () => {
    const result = extractPptx(readFileSync(fixture("two-slide.pptx")));
    if (!result.ok) throw new Error(result.reason);
    expect(result.slides).toBe(2);
    expect(result.text).toContain("=== slide 1 of 2 ===");
    expect(result.text).toContain("Quarterly Review");
    expect(result.text).toContain("Revenue up 12%");
    expect(result.text).toContain("=== slide 2 of 2 ===");
    // <a:br/> between runs renders as a line break.
    expect(result.text).toContain("Next steps\nHire more raccoons");
  });

  test("slide order follows presentation.xml's sldIdLst, not filename numbers", () => {
    // reordered.pptx carries the same slide parts as two-slide.pptx but its
    // sldIdLst lists slide2.xml first.
    const result = extractPptx(readFileSync(fixture("reordered.pptx")));
    if (!result.ok) throw new Error(result.reason);
    expect(result.slides).toBe(2);
    expect(result.text.indexOf("Next steps")).toBeLessThan(
      result.text.indexOf("Quarterly Review"),
    );
    // Speaker notes stay paired to their slide file (slide2 ↔ notesSlide2),
    // so they now appear under the FIRST marker.
    const notesAt = result.text.indexOf("[speaker notes]");
    expect(notesAt).toBeGreaterThan(result.text.indexOf("=== slide 1 of 2 ==="));
    expect(notesAt).toBeLessThan(result.text.indexOf("=== slide 2 of 2 ==="));
  });

  test("appends speaker notes under their slide", () => {
    const result = extractPptx(readFileSync(fixture("two-slide.pptx")));
    if (!result.ok) throw new Error(result.reason);
    const slide2At = result.text.indexOf("=== slide 2 of 2 ===");
    const notesAt = result.text.indexOf("[speaker notes]");
    expect(notesAt).toBeGreaterThan(slide2At);
    expect(result.text).toContain("Remember to mention the hiring plan.");
    // Slide 1 has no notes part; exactly one notes block.
    expect(result.text.match(/\[speaker notes\]/g)).toHaveLength(1);
  });

  test("the slide cap bounds extraction and reports the true total", () => {
    const result = extractPptx(readFileSync(fixture("two-slide.pptx")), { slideCap: 1 });
    if (!result.ok) throw new Error(result.reason);
    expect(result.slides).toBe(2);
    expect(result.text).toContain("=== slide 1 of 2 ===");
    expect(result.text).not.toContain("=== slide 2 of 2 ===");
    expect(result.text).toContain("1 of 2 slides extracted");
  });

  test("a zip with no slides fails closed with a reason", () => {
    const result = extractPptx(readFileSync(fixture("sample.zip")));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toContain("PowerPoint");
  });

  test("non-zip bytes fail closed", () => {
    const result = extractPptx(Buffer.from("plain text, definitely not a zip archive here"));
    expect(result.ok).toBe(false);
  });

  test("empty-slide note constant is used for textless slides", () => {
    expect(PPTX_EMPTY_SLIDE_NOTE).toContain("no text on this slide");
  });
});
