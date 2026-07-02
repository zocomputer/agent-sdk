import { describe, expect, test } from "bun:test";
import {
  buildFileView,
  READ_FILE_DEFAULT_LINE_LIMIT,
  READ_FILE_MAX_CONTENT_CHARS,
  READ_FILE_MAX_LINE_CHARS,
} from "./file-view";

const fileOf = (lines: string[]) => lines.join("\n");

describe("buildFileView", () => {
  test("returns a small file whole, untruncated, with no note", () => {
    const view = buildFileView(fileOf(["alpha", "beta", "gamma"]));
    expect(view.totalLines).toBe(3);
    expect(view.startLine).toBe(1);
    expect(view.endLine).toBe(3);
    expect(view.truncated).toBe(false);
    expect(view.note).toBeNull();
    expect(view.content).toBe("     1|alpha\n     2|beta\n     3|gamma");
  });

  test("empty file yields the single empty line split() produces", () => {
    const view = buildFileView("");
    expect(view.totalLines).toBe(1);
    expect(view.endLine).toBe(1);
    expect(view.truncated).toBe(false);
    expect(view.content).toBe("     1|");
  });

  test("applies the default line limit and points at the continuation", () => {
    const lines = Array.from({ length: READ_FILE_DEFAULT_LINE_LIMIT + 50 }, (_, i) => `l${i}`);
    const view = buildFileView(fileOf(lines));
    expect(view.endLine).toBe(READ_FILE_DEFAULT_LINE_LIMIT);
    expect(view.note).toContain(`offset=${READ_FILE_DEFAULT_LINE_LIMIT + 1}`);
    // The default window ending early is pagination, not truncation.
    expect(view.truncated).toBe(false);
  });

  test("windows by explicit offset/limit", () => {
    const view = buildFileView(fileOf(["a", "b", "c", "d", "e"]), { offset: 2, limit: 2 });
    expect(view.startLine).toBe(2);
    expect(view.endLine).toBe(3);
    expect(view.content).toBe("     2|b\n     3|c");
    expect(view.note).toContain("offset=4");
  });

  test("a limit reaching exactly EOF has no note", () => {
    const view = buildFileView(fileOf(["a", "b", "c"]), { offset: 2, limit: 2 });
    expect(view.endLine).toBe(3);
    expect(view.note).toBeNull();
  });

  test("clips a pathologically long line and flags truncation", () => {
    const long = "x".repeat(READ_FILE_MAX_LINE_CHARS + 100);
    const view = buildFileView(fileOf([long, "short"]));
    expect(view.truncated).toBe(true);
    expect(view.content).toContain("… [line truncated]");
    expect(view.content).toContain("     2|short");
    // The clipped line keeps exactly the cap's worth of content.
    const firstLine = view.content.split("\n")[0] ?? "";
    expect(firstLine).toContain("x".repeat(READ_FILE_MAX_LINE_CHARS));
    expect(firstLine).not.toContain("x".repeat(READ_FILE_MAX_LINE_CHARS + 1));
  });

  test("stops early when the content budget is hit, before the requested window", () => {
    // ~1000 chars per line → the 50k budget cuts well before 200 lines.
    const lines = Array.from({ length: 200 }, () => "y".repeat(1_000));
    const view = buildFileView(fileOf(lines));
    expect(view.endLine).toBeLessThan(200);
    expect(view.truncated).toBe(true);
    expect(view.note).toContain("output budget reached");
    expect(view.content.length).toBeLessThanOrEqual(READ_FILE_MAX_CONTENT_CHARS);
  });

  test("the per-line cap keeps even a budget-sized line from ending the window", () => {
    const huge = "z".repeat(READ_FILE_MAX_CONTENT_CHARS * 2);
    const view = buildFileView(fileOf([huge, "next"]));
    // Clipped to the line cap, the huge line fits the budget with room for the rest.
    expect(view.endLine).toBe(2);
    expect(view.content).toContain("… [line truncated]");
    expect(view.content).toContain("     2|next");
    expect(view.truncated).toBe(true);
  });

  test("offset past EOF returns an empty window and says so", () => {
    const view = buildFileView(fileOf(["only"]), { offset: 10 });
    expect(view.content).toBe("");
    expect(view.startLine).toBe(10);
    expect(view.endLine).toBe(9);
    expect(view.note).toContain("past the end");
  });
});
