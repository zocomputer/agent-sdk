import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// Bounded stream capture for shell output. The old capture kept a 100k-char
// head and stopped accumulating — the tail (where test runners print the
// failure summary) was gone forever. This keeps head AND tail within a fixed
// in-context budget and, on first overflow, spills the *complete* output to a
// file the model can grep/read instead of re-running the command (opencode's
// truncate-with-spill design). See plans/ben/rib-speed-opencode-lessons.md.

export const HEAD_CHARS = 25_000;
export const TAIL_CHARS = 25_000;

// Directory name for spilled outputs under the agent's state dir. Exported so
// retention sweeps (e.g. rib's) can find and prune old spills.
export const TOOL_OUTPUT_DIRNAME = "tool-outputs";

export interface CaptureSnapshot {
  /** Bounded text; when truncated, head + a marker naming the spill file + tail. */
  readonly text: string;
  readonly totalChars: number;
  readonly truncated: boolean;
  /** Absolute path of the complete output, when spilled successfully. */
  readonly spillPath: string | null;
}

export interface BoundedCapture {
  append(chunk: string): void;
  snapshot(): CaptureSnapshot;
  /** The most recent text we hold: the whole output until overflow, the rolling tail after. */
  latest(): string;
  totalChars(): number;
}

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

  const writeSpill = (text: string, first: boolean): void => {
    if (spill === "failed" || opts.spillPath === undefined) return;
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
        head += chunk.slice(0, room);
        // The spill file starts as everything seen so far, so it's always complete.
        writeSpill(head + chunk.slice(room), true);
        tail = chunk.slice(room).slice(-tailCap);
        return;
      }
      writeSpill(chunk, false);
      tail = (tail + chunk).slice(-tailCap);
    },
    snapshot() {
      if (!overflowed) {
        return { text: head, totalChars: total, truncated: false, spillPath: null };
      }
      if (total <= headCap + tailCap) {
        // Head overflowed but the tail still holds the rest — contiguous, complete.
        return { text: head + tail, totalChars: total, truncated: false, spillPath: null };
      }
      const where =
        spill === "live" ? `; full output: ${opts.spillLabel ?? opts.spillPath}` : "";
      const marker = `\n… [output truncated: showing first ${headCap} and last ${tailCap} of ${total} chars${where}]\n`;
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
