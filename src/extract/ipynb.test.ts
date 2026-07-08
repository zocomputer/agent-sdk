import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { extractNotebook } from "./ipynb";

const fixture = (name: string) => new URL(`fixtures/${name}`, import.meta.url).pathname;

describe("extractNotebook", () => {
  const load = () => {
    const result = extractNotebook(readFileSync(fixture("three-cell.ipynb")));
    if (!result.ok) throw new Error(result.reason);
    return result;
  };

  test("renders cells in order under cell markers", () => {
    const result = load();
    expect(result.cells).toBe(3);
    expect(result.text).toContain("=== cell 1 of 3 (markdown) ===");
    expect(result.text).toContain("=== cell 2 of 3 (code) ===");
    expect(result.text).toContain("=== cell 3 of 3 (code) ===");
  });

  test("markdown cells render verbatim", () => {
    const result = load();
    expect(result.text).toContain("# Analysis\nSome prose.");
  });

  test("code cells are fenced with the notebook language", () => {
    const result = load();
    expect(result.text).toContain("```python\nprint('hi')\n1 + 1\n```");
  });

  test("stream and text/plain outputs render as text", () => {
    const result = load();
    expect(result.text).toContain("\nhi");
    expect(result.text).toContain("\n2");
    expect(result.text).toContain("<Figure size 640x480>");
  });

  test("binary output data becomes a mime stub, never base64", () => {
    const result = load();
    expect(result.text).toContain("[image/png output]");
    expect(result.text).not.toContain("iVBORw0KGgo");
  });

  test("error outputs render ename/evalue with ANSI stripped", () => {
    const result = load();
    expect(result.text).toContain("NameError: name 'boom' is not defined");
    expect(result.text).not.toContain("\u001b[");
  });

  test("string (non-array) cell source is accepted", () => {
    const result = load();
    // Cell 3's source is a plain string in the fixture.
    expect(result.text).toContain("```python\nboom()\n```");
  });

  test("nbformat 3 notebooks fail with a convert hint", () => {
    const v3 = JSON.stringify({ nbformat: 3, worksheets: [{ cells: [] }] });
    const result = extractNotebook(Buffer.from(v3));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toContain("nbconvert");
  });

  test("invalid JSON fails closed with a reason", () => {
    const result = extractNotebook(Buffer.from("{not json"));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toContain("not valid JSON");
  });

  test("JSON without cells fails closed", () => {
    const result = extractNotebook(Buffer.from(JSON.stringify({ hello: "world" })));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toContain("does not look like a notebook");
  });
});
