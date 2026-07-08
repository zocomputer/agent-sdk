import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { extractOdp, extractOdt } from "./odf";

const fixture = (name: string) => new URL(`fixtures/${name}`, import.meta.url).pathname;

describe("extractOdt", () => {
  test("extracts headings and paragraphs in order", () => {
    const result = extractOdt(readFileSync(fixture("sample.odt")));
    if (!result.ok) throw new Error(result.reason);
    expect(result.text.split("\n")[0]).toBe("Trip Notes");
    expect(result.text).toContain("Trip Notes");
  });

  test("renders text:tab, text:line-break, and text:s whitespace", () => {
    const result = extractOdt(readFileSync(fixture("sample.odt")));
    if (!result.ok) throw new Error(result.reason);
    expect(result.text).toContain("First\ttabbed");
    expect(result.text).toContain("Line one\nline two");
    expect(result.text).toContain("Wide   gap"); // text:s text:c="3"
  });

  test("a zip without content.xml fails closed with a reason", () => {
    const result = extractOdt(readFileSync(fixture("sample.zip")));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toContain("content.xml");
  });

  test("non-zip bytes fail closed", () => {
    const result = extractOdt(Buffer.from("plain text, definitely not a zip archive here"));
    expect(result.ok).toBe(false);
  });
});

describe("extractOdp", () => {
  test("extracts draw:page slides under slide markers", () => {
    const result = extractOdp(readFileSync(fixture("two-page.odp")));
    if (!result.ok) throw new Error(result.reason);
    expect(result.slides).toBe(2);
    expect(result.text).toContain("=== slide 1 of 2 ===");
    expect(result.text).toContain("Welcome to the demo");
    expect(result.text).toContain("=== slide 2 of 2 ===");
    expect(result.text).toContain("Questions?");
    // Slide order follows document order.
    expect(result.text.indexOf("Welcome to the demo")).toBeLessThan(
      result.text.indexOf("Questions?"),
    );
  });

  test("a zip without content.xml fails closed", () => {
    const result = extractOdp(readFileSync(fixture("sample.zip")));
    expect(result.ok).toBe(false);
  });

  test("odt content routed to odp still reads via the implicit page", () => {
    const result = extractOdp(readFileSync(fixture("sample.odt")));
    if (!result.ok) throw new Error(result.reason);
    expect(result.slides).toBe(1);
    expect(result.text).toContain("Trip Notes");
  });
});
