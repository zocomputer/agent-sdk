import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createBoundedCapture } from "./bounded-output";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "rib-bounded-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const opts = (overrides: Record<string, unknown> = {}) => ({
  headChars: 10,
  tailChars: 10,
  spillPath: join(dir, "spill.log"),
  ...overrides,
});

describe("createBoundedCapture", () => {
  test("passes under-budget output through untouched, no spill file", () => {
    const cap = createBoundedCapture(opts());
    cap.append("hell");
    cap.append("o!");
    const snap = cap.snapshot();
    expect(snap).toEqual({ text: "hello!", totalChars: 6, truncated: false, spillPath: null });
    expect(() => readFileSync(join(dir, "spill.log"))).toThrow();
  });

  test("output exactly at the head budget stays complete", () => {
    const cap = createBoundedCapture(opts());
    cap.append("a".repeat(10));
    expect(cap.snapshot()).toEqual({
      text: "a".repeat(10),
      totalChars: 10,
      truncated: false,
      spillPath: null,
    });
  });

  test("head overflow that still fits head+tail is contiguous and complete", () => {
    const cap = createBoundedCapture(opts());
    cap.append("a".repeat(10));
    cap.append("b".repeat(8)); // total 18 ≤ 10 + 10 — no gap
    const snap = cap.snapshot();
    expect(snap.text).toBe("a".repeat(10) + "b".repeat(8));
    expect(snap.truncated).toBe(false);
    expect(snap.spillPath).toBeNull();
    // The spill file exists (overflow happened) but the snapshot doesn't need it.
    expect(readFileSync(join(dir, "spill.log"), "utf8")).toBe("a".repeat(10) + "b".repeat(8));
  });

  test("a real gap yields head + marker + tail and points at the spill file", () => {
    const cap = createBoundedCapture(opts({ spillLabel: ".rib/tool-outputs/spill.log" }));
    cap.append("a".repeat(10) + "MIDDLE" + "b".repeat(10) + "c".repeat(10));
    const snap = cap.snapshot();
    expect(snap.truncated).toBe(true);
    expect(snap.totalChars).toBe(36);
    expect(snap.spillPath).toBe(join(dir, "spill.log"));
    expect(snap.text.startsWith("a".repeat(10))).toBe(true);
    expect(snap.text.endsWith("c".repeat(10))).toBe(true);
    expect(snap.text).toContain(
      "… [output truncated: showing first 10 and last 10 of 36 chars; full output: .rib/tool-outputs/spill.log]",
    );
    expect(snap.text).not.toContain("MIDDLE");
  });

  test.each([
    ["exactly at the head budget", 10],
    ["one under the head budget", 9],
    ["one over the head budget", 11],
  ])("spill file is byte-complete when the first chunk lands %s", (_name, firstLen) => {
    const cap = createBoundedCapture(opts());
    const first = "x".repeat(firstLen);
    const rest = ["yyyy", "z".repeat(25), "end!"];
    cap.append(first);
    for (const chunk of rest) cap.append(chunk);
    const full = first + rest.join("");
    expect(cap.totalChars()).toBe(full.length);
    expect(readFileSync(join(dir, "spill.log"), "utf8")).toBe(full);
    const snap = cap.snapshot();
    expect(snap.truncated).toBe(true);
    expect(snap.text.endsWith(full.slice(-10))).toBe(true);
  });

  test("without a spillPath the marker names no file and spillPath stays null", () => {
    const cap = createBoundedCapture({ headChars: 10, tailChars: 10 });
    cap.append("a".repeat(40));
    const snap = cap.snapshot();
    expect(snap.truncated).toBe(true);
    expect(snap.spillPath).toBeNull();
    expect(snap.text).toContain("… [output truncated: showing first 10 and last 10 of 40 chars]");
    expect(snap.text).not.toContain("full output");
  });

  test("a failing spill path degrades to bounded-without-file", () => {
    // The spill "parent directory" is an existing file, so mkdirSync fails.
    const blockingFile = join(dir, "blocker");
    const primer = createBoundedCapture({ headChars: 1, tailChars: 1, spillPath: blockingFile });
    primer.append("xx"); // overflows → writes the blocker file
    const cap = createBoundedCapture({
      headChars: 10,
      tailChars: 10,
      spillPath: join(blockingFile, "out.log"),
    });
    cap.append("a".repeat(40));
    const snap = cap.snapshot();
    expect(snap.truncated).toBe(true);
    expect(snap.spillPath).toBeNull();
    expect(snap.text).not.toContain("full output");
  });

  test("latest() is the whole output before overflow and the rolling tail after", () => {
    const cap = createBoundedCapture(opts());
    cap.append("abc");
    expect(cap.latest()).toBe("abc");
    cap.append("d".repeat(30));
    cap.append("tail-end");
    expect(cap.latest()).toBe(("d".repeat(30) + "tail-end").slice(-10));
  });

  test("totalChars counts everything ever appended", () => {
    const cap = createBoundedCapture(opts());
    cap.append("a".repeat(7));
    cap.append("b".repeat(50));
    expect(cap.totalChars()).toBe(57);
  });
});
