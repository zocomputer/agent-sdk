// Bounded windowing for `read`. Tool results enter the transcript
// permanently — an unbounded file read is the single biggest uncontrolled
// token source once the prompt prefix is stable — so every read gets a
// default line limit, a per-line cap, and a total character budget
// (opencode's 2000-line / 50 KB tool-output budget, adapted). See
// plans/ben/rib-speed-opencode-lessons.md.

// Default window when the caller passes no `limit`.
export const READ_FILE_DEFAULT_LINE_LIMIT = 2_000;
// A single line longer than this (minified bundles, data blobs) is clipped.
export const READ_FILE_MAX_LINE_CHARS = 2_000;
// Total budget for the numbered content of one call.
export const READ_FILE_MAX_CONTENT_CHARS = 50_000;
// `read` refuses files bigger than this outright (stat guard — the file
// is never read); the model is steered to `bash` for surgical extraction.
export const READ_FILE_MAX_BYTES = 10_000_000;

export interface FileView {
  readonly totalLines: number;
  /** 1-based first line of the window. */
  readonly startLine: number;
  /** 1-based last line included; `startLine - 1` when the window is empty. */
  readonly endLine: number;
  /** Line-numbered content, `NNNNNN|text` per line. */
  readonly content: string;
  /** True when the view was cut short of the requested window (budget) or a line was clipped. */
  readonly truncated: boolean;
  /** Continuation guidance when there is more file past `endLine`, else null. */
  readonly note: string | null;
}

/** Build the bounded, line-numbered window of `text` for a read result. */
export function buildFileView(
  text: string,
  opts: { offset?: number; limit?: number } = {},
): FileView {
  const lines = text.split("\n");
  const start = opts.offset ? opts.offset - 1 : 0;
  const requestedEnd = Math.min(start + (opts.limit ?? READ_FILE_DEFAULT_LINE_LIMIT), lines.length);

  const parts: string[] = [];
  let chars = 0;
  let included = 0;
  let clippedLine = false;
  let budgetStopped = false;
  for (let i = start; i < requestedEnd; i++) {
    const raw = lines[i];
    if (raw === undefined) break;
    const clipped =
      raw.length > READ_FILE_MAX_LINE_CHARS
        ? `${raw.slice(0, READ_FILE_MAX_LINE_CHARS)}… [line truncated]`
        : raw;
    if (clipped !== raw) clippedLine = true;
    const numbered = `${String(i + 1).padStart(6)}|${clipped}`;
    // Always include at least one line so a pathological first line still returns something.
    if (included > 0 && chars + numbered.length + 1 > READ_FILE_MAX_CONTENT_CHARS) {
      budgetStopped = true;
      break;
    }
    parts.push(numbered);
    chars += numbered.length + 1;
    included += 1;
  }

  const endLine = start + included;
  const note =
    included === 0 && start >= lines.length
      ? `Offset ${start + 1} is past the end of the file (${lines.length} lines).`
      : endLine < lines.length
        ? `Showing lines ${start + 1}–${endLine} of ${lines.length}${budgetStopped ? " (output budget reached)" : ""}. Continue with offset=${endLine + 1}, or use grep to locate what you need.`
        : null;
  return {
    totalLines: lines.length,
    startLine: start + 1,
    endLine,
    content: parts.join("\n"),
    truncated: budgetStopped || clippedLine,
    note,
  };
}
