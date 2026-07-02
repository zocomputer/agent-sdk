import { readFileSync, statSync } from "node:fs";

// Search tools skip anything bigger — no source file we'd grep comes close,
// and the cap keeps a stray artifact from stalling a search.
export const MAX_SEARCH_FILE_BYTES = 1_500_000;

// A NUL byte in the first 8 KB marks a file binary — the same heuristic git
// and ripgrep use.
const BINARY_SNIFF_BYTES = 8_192;

export type SearchRead =
  | { kind: "text"; content: string }
  | { kind: "too-large"; bytes: number }
  | { kind: "binary" }
  | { kind: "unreadable" };

// Bounded read for search: stat before read so an oversized file is skipped
// without touching its bytes, and sniff raw bytes for NUL before decoding.
export function readTextForSearch(
  abs: string,
  maxBytes: number = MAX_SEARCH_FILE_BYTES,
): SearchRead {
  let size: number;
  try {
    const stats = statSync(abs);
    if (!stats.isFile()) return { kind: "unreadable" };
    size = stats.size;
  } catch {
    return { kind: "unreadable" };
  }
  if (size > maxBytes) return { kind: "too-large", bytes: size };
  let buf: Buffer;
  try {
    buf = readFileSync(abs);
  } catch {
    return { kind: "unreadable" };
  }
  if (buf.subarray(0, BINARY_SNIFF_BYTES).includes(0)) return { kind: "binary" };
  return { kind: "text", content: buf.toString("utf8") };
}
