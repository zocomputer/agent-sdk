import { afterAll, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readTextForSearch } from "./read-text";

const dir = mkdtempSync(join(tmpdir(), "rib-read-text-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function write(name: string, data: string | Buffer): string {
  const abs = join(dir, name);
  writeFileSync(abs, data);
  return abs;
}

test("reads a text file", () => {
  const abs = write("a.ts", "const a = 1;\n");
  expect(readTextForSearch(abs)).toEqual({ kind: "text", content: "const a = 1;\n" });
});

test("skips a file over the size cap without reading it", () => {
  const abs = write("big.txt", "0123456789");
  expect(readTextForSearch(abs, 5)).toEqual({ kind: "too-large", bytes: 10 });
});

test("flags a NUL byte in the sniff window as binary", () => {
  const abs = write("blob.bin", Buffer.from([0x89, 0x50, 0x00, 0x01, 0x02]));
  expect(readTextForSearch(abs)).toEqual({ kind: "binary" });
});

test("a NUL beyond the 8 KB sniff window still reads as text", () => {
  const abs = write("late-nul.txt", `${"a".repeat(9_000)}\u0000`);
  expect(readTextForSearch(abs).kind).toBe("text");
});

test("a missing file is unreadable", () => {
  expect(readTextForSearch(join(dir, "nope.ts"))).toEqual({ kind: "unreadable" });
});

test("a directory is unreadable", () => {
  expect(readTextForSearch(dir)).toEqual({ kind: "unreadable" });
});
