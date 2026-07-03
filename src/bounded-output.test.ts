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

// A lone surrogate in a tool result breaks JSON encoding to the model API, so
// no cut (head, tail, or the marker join) may land inside a surrogate pair.
describe("surrogate-pair safety", () => {
  const hasLoneSurrogate = (text: string): boolean => {
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code >= 0xd800 && code <= 0xdbff) {
        const next = i + 1 < text.length ? text.charCodeAt(i + 1) : 0;
        if (next >= 0xdc00 && next <= 0xdfff) {
          i += 1; // valid pair
          continue;
        }
        return true;
      }
      if (code >= 0xdc00 && code <= 0xdfff) return true;
    }
    return false;
  };

  test("head cut lands before a pair instead of splitting it", () => {
    const cap = createBoundedCapture({ headChars: 5, tailChars: 4 });
    // "abcd" + 😀 (2 units) + filler: a naive head cut at 5 splits the emoji.
    cap.append("abcd\u{1F600}" + "x".repeat(20));
    const snap = cap.snapshot();
    expect(snap.truncated).toBe(true);
    expect(hasLoneSurrogate(snap.text)).toBe(false);
    expect(snap.text.startsWith("abcd\n")).toBe(true); // emoji moved wholly out of head
  });

  test("a pair split across appends at an exactly-full head stays whole", () => {
    const cap = createBoundedCapture({ headChars: 5, tailChars: 4 });
    cap.append("abcd\uD83D"); // fills the head exactly, ending on the high half
    cap.append("\uDE00" + "x".repeat(20)); // low half arrives in the next chunk
    const snap = cap.snapshot();
    expect(snap.truncated).toBe(true);
    expect(hasLoneSurrogate(snap.text)).toBe(false);
    expect(hasLoneSurrogate(cap.latest())).toBe(false);
  });

  test("tail cut drops the orphaned low half instead of leading with it", () => {
    const cap = createBoundedCapture({ headChars: 4, tailChars: 4 });
    // Tail window would open mid-pair: 😀 sits astride the last-4 boundary.
    cap.append("abcd" + "x".repeat(20) + "y\u{1F600}z!");
    const snap = cap.snapshot();
    expect(snap.truncated).toBe(true);
    expect(hasLoneSurrogate(snap.text)).toBe(false);
    expect(snap.text.endsWith("\u{1F600}z!")).toBe(true);
  });

  test("property: no chunking of emoji/CJK text ever yields a lone surrogate", () => {
    // Deterministic corpus: pairs (😀🚀🎉), BMP CJK, ASCII — worst-case mix.
    const source = "😀ab🚀漢字c🎉de😀😀f漢🚀".repeat(6);
    const caps = [
      { headChars: 4, tailChars: 4 },
      { headChars: 5, tailChars: 3 },
      { headChars: 7, tailChars: 6 },
      { headChars: 11, tailChars: 5 },
    ];
    for (const { headChars, tailChars } of caps) {
      // Every fixed chunk size, including sizes that split pairs across appends.
      for (let chunkSize = 1; chunkSize <= 13; chunkSize++) {
        const cap = createBoundedCapture({ headChars, tailChars });
        for (let at = 0; at < source.length; at += chunkSize) {
          cap.append(source.slice(at, at + chunkSize));
        }
        const snap = cap.snapshot();
        const label = `head=${headChars} tail=${tailChars} chunk=${chunkSize}`;
        expect(hasLoneSurrogate(snap.text), label).toBe(false);
        expect(hasLoneSurrogate(cap.latest()), label).toBe(false);
        expect(snap.totalChars, label).toBe(source.length);
        if (!snap.truncated) expect(snap.text, label).toBe(source);
      }
    }
  });

  test("property: spill file stays byte-complete under surrogate nudges", () => {
    const source = "x😀y".repeat(10);
    const spillPath = join(dir, "surrogate-spill.log");
    const cap = createBoundedCapture({ headChars: 5, tailChars: 4, spillPath });
    for (let at = 0; at < source.length; at += 3) {
      cap.append(source.slice(at, at + 3));
    }
    expect(readFileSync(spillPath, "utf8")).toBe(source);
    expect(cap.snapshot().truncated).toBe(true);
  });
});
