import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { PDF_EMPTY_PAGE_NOTE, extractPdf } from "./pdf";

const fixture = new URL("fixtures/two-page.pdf", import.meta.url).pathname;

describe("extractPdf", () => {
  test("extracts per-page text under page markers", async () => {
    const result = await extractPdf(readFileSync(fixture));
    if (!result.ok) throw new Error(result.reason);
    expect(result.pages).toBe(2);
    expect(result.text).toContain("=== page 1 of 2 ===");
    expect(result.text).toContain("Hello from page one.");
    expect(result.text).toContain("Second line of page one.");
    // PDFium's \r\n is normalized away.
    expect(result.text).not.toContain("\r");
  });

  test("a page with no text layer gets the honest marker", async () => {
    const result = await extractPdf(readFileSync(fixture));
    if (!result.ok) throw new Error(result.reason);
    expect(result.text).toContain(`=== page 2 of 2 ===\n${PDF_EMPTY_PAGE_NOTE}`);
  });

  test("the page cap stops extraction but reports the true total", async () => {
    const result = await extractPdf(readFileSync(fixture), { pageCap: 1 });
    if (!result.ok) throw new Error(result.reason);
    expect(result.pages).toBe(2);
    expect(result.text).toContain("=== page 1 of 2 ===");
    expect(result.text).not.toContain("=== page 2 of 2 ===");
    expect(result.text).toContain("[extraction stopped at the page cap — 1 of 2 pages extracted]");
  });

  test("corrupt bytes fail closed with a reason", async () => {
    const result = await extractPdf(Buffer.from("%PDF-1.4 not really a pdf"));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason.length).toBeGreaterThan(0);
  });
});
