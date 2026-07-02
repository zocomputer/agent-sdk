import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { extractDocx } from "./docx";

const fixture = (name: string) => new URL(`fixtures/${name}`, import.meta.url).pathname;

describe("extractDocx", () => {
  test("extracts paragraph text", async () => {
    const result = await extractDocx(readFileSync(fixture("sample.docx")));
    if (!result.ok) throw new Error(result.reason);
    expect(result.text).toContain("Rib reads Word documents now.");
    expect(result.text).toContain("A second paragraph, for good measure.");
    expect(result.text.endsWith("\n\n")).toBe(false);
  });

  test("a zip that is not a docx fails closed with a reason", async () => {
    const result = await extractDocx(readFileSync(fixture("sample.zip")));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason.length).toBeGreaterThan(0);
  });

  test("non-zip bytes fail closed", async () => {
    const result = await extractDocx(Buffer.from("plain text"));
    expect(result.ok).toBe(false);
  });
});
