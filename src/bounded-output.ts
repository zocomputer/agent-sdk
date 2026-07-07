import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// Bounded stream capture for shell output. The old capture kept a 100k-char
// head and stopped accumulating — the tail (where test runners print the
// failure summary) was gone forever. This keeps head AND tail within a fixed
// in-context budget and, on first overflow, spills the *complete* output to a
// file the model can grep/read instead of re-running the command (opencode's
// truncate-with-spill design). See plans/ben/rib-speed-opencode-lessons.md.

/** Default head character cap for bounded captures. */
export const HEAD_CHARS = 25_000;
/** Default tail character cap for bounded captures. */
export const TAIL_CHARS = 25_000;

/**
 * Directory name for spilled tool outputs under the agent's state dir.
 * Retention sweeps (e.g. rib's) can locate and prune old spills via this.
 */
export const TOOL_OUTPUT_DIRNAME = "tool-outputs";

/**
 * Point-in-time capture snapshot: bounded text (head + marker + tail when
 * truncated), total character count, truncation flag, and the spill file path.
 */
export interface CaptureSnapshot {
  /** Bounded text; when truncated, head + a marker naming the spill file + tail. */
  readonly text: string;
  readonly totalChars: number;
  readonly truncated: boolean;
  /** Absolute path of the complete output, when spilled successfully. */
  readonly spillPath: string | null;
}

/**
 * A growing stream capture that keeps head + tail in-memory and spills the
 * complete output to a file on first overflow.
 */
export interface BoundedCapture {
  /** Add a chunk to the capture; updates head/tail/spill accordingly. */
  append(chunk: string): void;
  /** Point-in-time snapshot of bounded text, total chars, truncation, and spill path. */
  snapshot(): CaptureSnapshot;
  /** The most recent text we hold: the whole output until overflow, the rolling tail after. */
  latest(): string;
  /** Total characters appended so far. */
  totalChars(): number;
}

// The head/tail cuts index UTF-16 code units, so a naive slice can land inside
// a surrogate pair and leave a lone surrogate in the transcript (which then
// breaks JSON encoding to the model API). Nudge every cut off a pair boundary:
// a head cut never ends on a high surrogate, a tail cut never starts on a low.
const isHighSurrogate = (code: number): boolean => code >= 0xd800 && code <= 0xdbff;
const isLowSurrogate = (code: number): boolean => code >= 0xdc00 && code <= 0xdfff;

const endsOnHighSurrogate = (text: string): boolean =>
  text.length > 0 && isHighSurrogate(text.charCodeAt(text.length - 1));

/** Last `cap` chars of `text`, moved one right if that would open on a low surrogate. */
function takeTail(text: string, cap: number): string {
  if (text.length <= cap) return text;
  let start = text.length - cap;
  if (isLowSurrogate(text.charCodeAt(start))) start += 1;
  return text.slice(start);
}

/**
 * Create a bounded stream capture: keeps head + tail in-memory (within the
 * caps) and, on first overflow, spills the complete output to a file. Handles
 * surrogate pairs carefully so slices never land inside one.
 */
export function createBoundedCapture(
  opts: {
    headChars?: number;
    tailChars?: number;
    /** Absolute file path for the complete output; created lazily on first overflow. Omit to disable spilling. */
    spillPath?: string;
    /** How the marker names the spill file (e.g. repo-relative path). Defaults to `spillPath`. */
    spillLabel?: string;
  } = {},
): BoundedCapture {
  const headCap = opts.headChars ?? HEAD_CHARS;
  const tailCap = opts.tailChars ?? TAIL_CHARS;
  let head = "";
  let tail = "";
  let total = 0;
  let overflowed = false;
  // Three-state spill: not started, live, or failed (a failed spill degrades
  // to bounded-without-file rather than erroring the command).
  let spill: "none" | "live" | "failed" = opts.spillPath ? "none" : "failed";

  // A surrogate pair split across appends would hit the UTF-8 file write as a
  // lone surrogate and encode as U+FFFD; hold the high half until its partner
  // arrives so the spill file stays byte-faithful.
  let spillCarry = "";

  const writeSpill = (chunk: string, first: boolean): void => {
    if (spill === "failed" || opts.spillPath === undefined) return;
    let text = spillCarry + chunk;
    if (endsOnHighSurrogate(text)) {
      spillCarry = text.slice(-1);
      text = text.slice(0, -1);
    } else {
      spillCarry = "";
    }
    try {
      if (first) {
        mkdirSync(dirname(opts.spillPath), { recursive: true });
        writeFileSync(opts.spillPath, text);
        spill = "live";
      } else {
        appendFileSync(opts.spillPath, text);
      }
    } catch {
      spill = "failed";
    }
  };

  return {
    append(chunk) {
      total += chunk.length;
      if (!overflowed) {
        const room = headCap - head.length;
        if (chunk.length <= room) {
          head += chunk;
          return;
        }
        overflowed = true;
        // Don't cut through a surrogate pair inside this chunk…
        let cut = room;
        if (cut > 0 && isHighSurrogate(chunk.charCodeAt(cut - 1))) cut -= 1;
        head += chunk.slice(0, cut);
        // …and don't freeze a head that ends on one either (a pair can also be
        // split across appends: the previous chunk filled the head exactly and
        // ended on the high half). Move the orphan into the tail stream.
        let remainder = chunk.slice(cut);
        if (endsOnHighSurrogate(head)) {
          remainder = head.slice(-1) + remainder;
          head = head.slice(0, -1);
        }
        // The spill file starts as everything seen so far, so it's always complete.
        writeSpill(head + remainder, true);
        tail = takeTail(remainder, tailCap);
        return;
      }
      writeSpill(chunk, false);
      tail = takeTail(tail + chunk, tailCap);
    },
    snapshot() {
      if (!overflowed) {
        return { text: head, totalChars: total, truncated: false, spillPath: null };
      }
      if (head.length + tail.length === total) {
        // Head overflowed but the tail still holds the rest — contiguous,
        // complete. Checked by length (not caps): a surrogate nudge can move a
        // char from head into a tail that then trims, and that loss must
        // surface as truncation.
        return { text: head + tail, totalChars: total, truncated: false, spillPath: null };
      }
      const where =
        spill === "live" ? `; full output: ${opts.spillLabel ?? opts.spillPath}` : "";
      // Actual lengths, not the caps — surrogate nudges can run a char short.
      const marker = `\n… [output truncated: showing first ${head.length} and last ${tail.length} of ${total} chars${where}]\n`;
      return {
        text: `${head}${marker}${tail}`,
        totalChars: total,
        truncated: true,
        spillPath: spill === "live" && opts.spillPath !== undefined ? opts.spillPath : null,
      };
    },
    latest() {
      return overflowed ? tail : head;
    },
    totalChars() {
      return total;
    },
  };
}
