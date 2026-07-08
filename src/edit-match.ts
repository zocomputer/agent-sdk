// The forgiving-edit matcher behind the `edit` tool: a cascade of replacer
// strategies that resolve a model-supplied `old_string` to the exact span it
// meant, tolerating the near-miss mistakes models actually make (re-indented
// snippets, collapsed whitespace, double-escaped strings, trimmed
// boundaries, slightly-wrong middle lines between correct anchors).
//
// Ported from opencode's `packages/opencode/src/tool/edit.ts` (MIT, commit
// 14a5529) — the nine replacers, their order, the disproportionate-match
// guard, and the replace loop's semantics are kept verbatim so we inherit
// their field-tested precedence. Deliberate deviations:
//   - `replaceAll` uses split/join instead of `String.replaceAll`, which
//     interprets `$&`/`$'` patterns in the replacement string.
//   - The result reports which strategy matched (`matched`) and how many
//     spans were replaced (`replacements`) — telemetry for evals and the
//     regression signal if a fuzzy strategy starts firing where exact
//     should.
//   - Failures are typed errors so the tool layer can add path context and
//     tests can assert the failure kind without string-matching.
//
// Pure string logic, framework-free: works identically above both
// `WorkspaceIO` backends (local and sandbox).

/** A matching strategy: yields candidate spans of `content` that `find` may have meant. */
export type Replacer = (content: string, find: string) => Generator<string, void, unknown>;

/** Which replacer strategy resolved the edit, in the tool result's `matched` field. */
export type MatchStrategy =
  | "simple"
  | "line_trimmed"
  | "block_anchor"
  | "whitespace_normalized"
  | "indentation_flexible"
  | "escape_normalized"
  | "trimmed_boundary"
  | "context_aware"
  | "multi_occurrence";

/** `old_string` (or any forgiving variant of it) does not occur in the content. */
export class EditNotFoundError extends Error {
  constructor() {
    super("old_string not found. It must match the file contents exactly, including whitespace and indentation.");
    this.name = "EditNotFoundError";
  }
}

/** Every candidate span occurs more than once, so a single replacement would be ambiguous. */
export class EditNotUniqueError extends Error {
  constructor() {
    super("old_string is not unique. Add surrounding context to make the match unique, or set replace_all.");
    this.name = "EditNotUniqueError";
  }
}

/** The closest match is disproportionately larger than `old_string` — refusing to splice it. */
export class EditDisproportionateError extends Error {
  constructor() {
    super(
      "Refusing replacement because the matched span is much larger than old_string. Re-read the file and provide the full exact old_string for the intended replacement.",
    );
    this.name = "EditDisproportionateError";
  }
}

/** A successful forgiving replacement. */
export interface ForgivingReplaceResult {
  /** The content after the replacement. */
  content: string;
  /** The strategy that resolved the match. */
  matched: MatchStrategy;
  /** How many spans were replaced (1 unless `replaceAll`). */
  replacements: number;
}

// Similarity threshold for block-anchor fallback matching (opencode uses the
// same 0.65 for the single- and multiple-candidate paths).
const BLOCK_ANCHOR_SIMILARITY_THRESHOLD = 0.65;

// Levenshtein distance, two-row rolling implementation (opencode uses a full
// matrix; this is the same recurrence adapted for noUncheckedIndexedAccess —
// the `?? 0` fallbacks are unreachable by construction of the row lengths).
function levenshtein(a: string, b: string): number {
  if (a === "" || b === "") return Math.max(a.length, b.length);
  let prev: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const curr: number[] = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr.push(Math.min((prev[j] ?? 0) + 1, (curr[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost));
    }
    prev = curr;
  }
  return prev[b.length] ?? 0;
}

/** Yields `find` verbatim — the exact-match strategy, always tried first. */
export const SimpleReplacer: Replacer = function* (_content, find) {
  yield find;
};

/** Per-line trim-equality over a sliding window; yields the exact original span. */
export const LineTrimmedReplacer: Replacer = function* (content, find) {
  const originalLines = content.split("\n");
  const searchLines = find.split("\n");

  if (searchLines[searchLines.length - 1] === "") {
    searchLines.pop();
  }

  for (let i = 0; i <= originalLines.length - searchLines.length; i++) {
    let matches = true;

    for (const [j, searchLine] of searchLines.entries()) {
      const originalLine = originalLines[i + j];
      if (originalLine === undefined || originalLine.trim() !== searchLine.trim()) {
        matches = false;
        break;
      }
    }

    if (matches) {
      let matchStartIndex = 0;
      for (let k = 0; k < i; k++) {
        matchStartIndex += (originalLines[k] ?? "").length + 1;
      }

      let matchEndIndex = matchStartIndex;
      for (let k = 0; k < searchLines.length; k++) {
        matchEndIndex += (originalLines[i + k] ?? "").length;
        if (k < searchLines.length - 1) {
          matchEndIndex += 1; // newline between lines, none after the last
        }
      }

      yield content.substring(matchStartIndex, matchEndIndex);
    }
  }
};

// Average trimmed-line Levenshtein similarity between a candidate block's
// middle lines and the search's, shared by BlockAnchorReplacer's single- and
// multi-candidate paths.
function blockSimilarity(
  originalLines: readonly string[],
  searchLines: readonly string[],
  startLine: number,
  endLine: number,
): number {
  const searchBlockSize = searchLines.length;
  const actualBlockSize = endLine - startLine + 1;
  const linesToCheck = Math.min(searchBlockSize - 2, actualBlockSize - 2);
  if (linesToCheck <= 0) return 1.0; // no middle lines — accept on anchors alone

  let similarity = 0;
  for (let j = 1; j < searchBlockSize - 1 && j < actualBlockSize - 1; j++) {
    const originalLine = (originalLines[startLine + j] ?? "").trim();
    const searchLine = (searchLines[j] ?? "").trim();
    const maxLen = Math.max(originalLine.length, searchLine.length);
    if (maxLen === 0) continue;
    const distance = levenshtein(originalLine, searchLine);
    similarity += 1 - distance / maxLen;
  }
  return similarity / linesToCheck;
}

// The exact original span covering originalLines[startLine..endLine].
function lineSpan(content: string, originalLines: readonly string[], startLine: number, endLine: number): string {
  let matchStartIndex = 0;
  for (let k = 0; k < startLine; k++) {
    matchStartIndex += (originalLines[k] ?? "").length + 1;
  }
  let matchEndIndex = matchStartIndex;
  for (let k = startLine; k <= endLine; k++) {
    matchEndIndex += (originalLines[k] ?? "").length;
    if (k < endLine) {
      matchEndIndex += 1;
    }
  }
  return content.substring(matchStartIndex, matchEndIndex);
}

/**
 * First/last trimmed lines as anchors (finds of 3+ lines only); candidate
 * block size within 25% of the search's; middle lines scored by Levenshtein
 * similarity with a 0.65 threshold — the best candidate wins.
 */
export const BlockAnchorReplacer: Replacer = function* (content, find) {
  const originalLines = content.split("\n");
  const searchLines = find.split("\n");

  if (searchLines.length < 3) {
    return;
  }

  if (searchLines[searchLines.length - 1] === "") {
    searchLines.pop();
  }

  const firstLineSearch = (searchLines[0] ?? "").trim();
  const lastLineSearch = (searchLines[searchLines.length - 1] ?? "").trim();
  const searchBlockSize = searchLines.length;
  const maxLineDelta = Math.max(1, Math.floor(searchBlockSize * 0.25));

  // Collect candidate positions where both anchors match.
  const candidates: Array<{ startLine: number; endLine: number }> = [];
  for (const [i, line] of originalLines.entries()) {
    if (line.trim() !== firstLineSearch) {
      continue;
    }
    // Look for the matching last line after this first line (first occurrence only).
    for (let j = i + 2; j < originalLines.length; j++) {
      if ((originalLines[j] ?? "").trim() === lastLineSearch) {
        const actualBlockSize = j - i + 1;
        if (Math.abs(actualBlockSize - searchBlockSize) <= maxLineDelta) {
          candidates.push({ startLine: i, endLine: j });
        }
        break;
      }
    }
  }

  if (candidates.length === 0) {
    return;
  }

  let best: { startLine: number; endLine: number } | null = null;
  let maxSimilarity = -1;
  for (const candidate of candidates) {
    const similarity = blockSimilarity(originalLines, searchLines, candidate.startLine, candidate.endLine);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      best = candidate;
    }
  }

  if (best && maxSimilarity >= BLOCK_ANCHOR_SIMILARITY_THRESHOLD) {
    yield lineSpan(content, originalLines, best.startLine, best.endLine);
  }
};

/** Collapses runs of whitespace to single spaces before comparing lines, substrings, and blocks. */
export const WhitespaceNormalizedReplacer: Replacer = function* (content, find) {
  const normalizeWhitespace = (text: string) => text.replace(/\s+/g, " ").trim();
  const normalizedFind = normalizeWhitespace(find);

  // Single-line matches (and substring matches within a line).
  const lines = content.split("\n");
  for (const line of lines) {
    const normalizedLine = normalizeWhitespace(line);
    if (normalizedLine === normalizedFind) {
      yield line;
    } else if (normalizedLine.includes(normalizedFind)) {
      // Recover the actual matching substring of the original line by
      // rejoining the find's words with flexible whitespace.
      const words = find.trim().split(/\s+/);
      if (words.length > 0) {
        const pattern = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
        try {
          const match = line.match(new RegExp(pattern));
          if (match) {
            yield match[0];
          }
        } catch {
          // Invalid regex pattern — skip.
        }
      }
    }
  }

  // Multi-line block matches.
  const findLines = find.split("\n");
  if (findLines.length > 1) {
    for (let i = 0; i <= lines.length - findLines.length; i++) {
      const block = lines.slice(i, i + findLines.length);
      if (normalizeWhitespace(block.join("\n")) === normalizedFind) {
        yield block.join("\n");
      }
    }
  }
};

/**
 * Strips the common minimum indentation from both sides before block
 * comparison — the "model re-indented the snippet" case. In-cascade this is
 * shadowed by LineTrimmedReplacer (per-line trim-equality is strictly more
 * forgiving than common-indent removal); kept for order parity with
 * opencode and for direct use.
 */
export const IndentationFlexibleReplacer: Replacer = function* (content, find) {
  const removeIndentation = (text: string) => {
    const textLines = text.split("\n");
    const nonEmptyLines = textLines.filter((line) => line.trim().length > 0);
    if (nonEmptyLines.length === 0) return text;

    const minIndent = Math.min(...nonEmptyLines.map((line) => (/^(\s*)/.exec(line))?.[1]?.length ?? 0));

    return textLines.map((line) => (line.trim().length === 0 ? line : line.slice(minIndent))).join("\n");
  };

  const normalizedFind = removeIndentation(find);
  const contentLines = content.split("\n");
  const findLines = find.split("\n");

  for (let i = 0; i <= contentLines.length - findLines.length; i++) {
    const block = contentLines.slice(i, i + findLines.length).join("\n");
    if (removeIndentation(block) === normalizedFind) {
      yield block;
    }
  }
};

/** Unescapes `\n`, `\t`, `\r`, quotes, backticks, `\\`, `\$`, and escaped literal newlines — the "model double-escaped the string" case. */
export const EscapeNormalizedReplacer: Replacer = function* (content, find) {
  const unescapeString = (str: string): string =>
    str.replace(/\\(n|t|r|'|"|`|\\|\n|\$)/g, (match, capturedChar) => {
      switch (capturedChar) {
        case "n":
          return "\n";
        case "t":
          return "\t";
        case "r":
          return "\r";
        case "'":
          return "'";
        case '"':
          return '"';
        case "`":
          return "`";
        case "\\":
          return "\\";
        case "\n":
          return "\n";
        case "$":
          return "$";
        default:
          return match;
      }
    });

  const unescapedFind = unescapeString(find);

  // Direct match with the unescaped find.
  if (content.includes(unescapedFind)) {
    yield unescapedFind;
  }

  // Blocks in the content whose unescaped form matches the unescaped find.
  const lines = content.split("\n");
  const findLines = unescapedFind.split("\n");

  for (let i = 0; i <= lines.length - findLines.length; i++) {
    const block = lines.slice(i, i + findLines.length).join("\n");
    if (unescapeString(block) === unescapedFind) {
      yield block;
    }
  }
};

/** Trims the find's boundary whitespace, and matches blocks whose trim equals it. */
export const TrimmedBoundaryReplacer: Replacer = function* (content, find) {
  const trimmedFind = find.trim();

  if (trimmedFind === find) {
    return; // already trimmed — SimpleReplacer covered it
  }

  if (content.includes(trimmedFind)) {
    yield trimmedFind;
  }

  const lines = content.split("\n");
  const findLines = find.split("\n");

  for (let i = 0; i <= lines.length - findLines.length; i++) {
    const block = lines.slice(i, i + findLines.length).join("\n");
    if (block.trim() === trimmedFind) {
      yield block;
    }
  }
};

/**
 * Anchors like BlockAnchorReplacer (finds of 3+ lines) but the block must be
 * exactly the find's length and at least half the middle non-empty trimmed
 * lines must match; first occurrence only.
 */
export const ContextAwareReplacer: Replacer = function* (content, find) {
  const findLines = find.split("\n");
  if (findLines.length < 3) {
    return;
  }

  if (findLines[findLines.length - 1] === "") {
    findLines.pop();
  }

  const contentLines = content.split("\n");
  const firstLine = (findLines[0] ?? "").trim();
  const lastLine = (findLines[findLines.length - 1] ?? "").trim();

  for (const [i, line] of contentLines.entries()) {
    if (line.trim() !== firstLine) continue;

    // Look for the matching last line (first occurrence only).
    for (let j = i + 2; j < contentLines.length; j++) {
      if ((contentLines[j] ?? "").trim() === lastLine) {
        const blockLines = contentLines.slice(i, j + 1);

        if (blockLines.length === findLines.length) {
          let matchingLines = 0;
          let totalNonEmptyLines = 0;

          for (let k = 1; k < blockLines.length - 1; k++) {
            const blockLine = (blockLines[k] ?? "").trim();
            const findLine = (findLines[k] ?? "").trim();
            if (blockLine.length > 0 || findLine.length > 0) {
              totalNonEmptyLines++;
              if (blockLine === findLine) {
                matchingLines++;
              }
            }
          }

          if (totalNonEmptyLines === 0 || matchingLines / totalNonEmptyLines >= 0.5) {
            yield blockLines.join("\n");
            break;
          }
        }
        break;
      }
    }
  }
};

/**
 * Yields every exact occurrence of the find. In-cascade this is shadowed by
 * SimpleReplacer (which already yields the find, and `replace_all` replaces
 * every occurrence of whichever candidate matched); kept for order parity
 * with opencode and for direct use.
 */
export const MultiOccurrenceReplacer: Replacer = function* (content, find) {
  let startIndex = 0;
  while (true) {
    const index = content.indexOf(find, startIndex);
    if (index === -1) break;
    yield find;
    startIndex = index + find.length;
  }
};

// The cascade, in opencode's exact order — cheap/exact strategies first,
// aggressive ones last. The order encodes precedence: the first candidate
// that occurs (uniquely, unless replaceAll) wins.
const REPLACERS: ReadonlyArray<readonly [MatchStrategy, Replacer]> = [
  ["simple", SimpleReplacer],
  ["line_trimmed", LineTrimmedReplacer],
  ["block_anchor", BlockAnchorReplacer],
  ["whitespace_normalized", WhitespaceNormalizedReplacer],
  ["indentation_flexible", IndentationFlexibleReplacer],
  ["escape_normalized", EscapeNormalizedReplacer],
  ["trimmed_boundary", TrimmedBoundaryReplacer],
  ["context_aware", ContextAwareReplacer],
  ["multi_occurrence", MultiOccurrenceReplacer],
];

/**
 * The safety valve that makes an aggressive cascade shippable: a fuzzy
 * strategy that "matches" a span wildly larger than what the model asked to
 * replace must refuse instead of splicing half the file. Thresholds verbatim
 * from opencode: 3+ extra lines (or 2x the lines), or — for multi-line
 * old_strings — trimmed length beyond `max(+500 chars, 4x)`.
 */
export function isDisproportionateMatch(search: string, oldString: string): boolean {
  const oldLines = oldString.split("\n").length;
  const searchLines = search.split("\n").length;
  if (searchLines >= Math.max(oldLines + 3, oldLines * 2)) return true;
  if (oldLines === 1) return false;
  return search.trim().length > Math.max(oldString.trim().length + 500, oldString.trim().length * 4);
}

/**
 * Resolve `oldString` to a span of `content` via the replacer cascade and
 * replace it with `newString`.
 *
 * Semantics (opencode's `replace()`): try each replacer in order; for each
 * candidate span it yields, the candidate must occur in the content, pass
 * the disproportionate-match guard, and — unless `replaceAll` — occur
 * exactly once. `replaceAll` replaces every occurrence of the first found
 * candidate. Throws {@link EditNotFoundError}, {@link EditNotUniqueError},
 * or {@link EditDisproportionateError}; plain `Error` for the identical /
 * empty `oldString` preconditions.
 */
export function replaceForgiving(
  content: string,
  oldString: string,
  newString: string,
  replaceAll = false,
): ForgivingReplaceResult {
  if (oldString === newString) {
    throw new Error("No changes to apply: old_string and new_string are identical.");
  }
  if (oldString === "") {
    throw new Error("old_string cannot be empty. Provide the exact text to replace, or use write to replace a whole file.");
  }

  let notFound = true;

  for (const [strategy, replacer] of REPLACERS) {
    for (const search of replacer(content, oldString)) {
      // An empty candidate (e.g. TrimmedBoundary on an all-whitespace
      // old_string) "occurs" everywhere — with replaceAll it would inject
      // new_string between every character. Skip it outright (opencode
      // survives this only via its uniqueness check on the non-replaceAll
      // path).
      if (search === "") continue;
      const index = content.indexOf(search);
      if (index === -1) continue;
      notFound = false;
      if (isDisproportionateMatch(search, oldString)) {
        throw new EditDisproportionateError();
      }
      if (replaceAll) {
        // split/join instead of String.replaceAll: the latter interprets
        // `$&`/`$'` patterns in the replacement string.
        const parts = content.split(search);
        return { content: parts.join(newString), matched: strategy, replacements: parts.length - 1 };
      }
      const lastIndex = content.lastIndexOf(search);
      if (index !== lastIndex) continue; // ambiguous candidate — try the next one
      return {
        content: content.substring(0, index) + newString + content.substring(index + search.length),
        matched: strategy,
        replacements: 1,
      };
    }
  }

  if (notFound) {
    throw new EditNotFoundError();
  }
  throw new EditNotUniqueError();
}

// --- Not-found "did you mean" hint -----------------------------------------

// Ported from goose's `find_similar_context` (crates/goose/src/agents/
// platform_extensions/developer/edit.rs, commit e6be2e9): anchor on the
// search's first non-empty trimmed line, find the closest content line, and
// return a small numbered window around it. Deviations: a Levenshtein
// fallback (≥ EDIT_HINT_SIMILARITY) when no line contains the anchor —
// our cascade already absorbed whitespace variants, so a miss here means the
// text genuinely differs (usually a stale or typo'd anchor line) — and
// line-numbered output matching `read`'s view so the model can orient.

// Minimum trimmed-line similarity for the fuzzy anchor fallback.
const EDIT_HINT_SIMILARITY = 0.6;
// Context lines shown on each side of the anchor line (goose uses 2).
const EDIT_HINT_CONTEXT_LINES = 2;
// Hard cap on the hint's total lines, guarding pathological inputs.
const EDIT_HINT_MAX_LINES = 20;
// Reverse containment (anchor contains the content line) only counts for
// lines this long — a trivial `}` or `);` is contained in almost any anchor
// and would hint at the first brace in the file (goose inherits this flaw;
// we deviate). Forward containment (line contains the anchor) has no floor:
// the anchor is the model's own first line, already specific.
const EDIT_HINT_MIN_REVERSE_LINE = 5;
// Lines longer than this are skipped by BOTH anchor passes (containment and
// the Levenshtein fallback, which is O(anchor·line) per line) — minified
// bundles/long data lines would stall the failure path, and a hintable
// anchor line in real source is never that long. A skipped hint is just
// `null`; the not-found error still steers the model to re-read.
const EDIT_HINT_MAX_LINE = 500;

/** The closest-match hint appended to a not-found edit error. */
export interface EditNotFoundHint {
  /** 1-based line number of the closest matching line. */
  line: number;
  /** Line-numbered window around the closest match (`read`-style `N|text`). */
  preview: string;
}

/**
 * Locate the region of `content` the model probably meant when `oldString`
 * failed every replacer, so the not-found error can point instead of just
 * refusing — a targeted preview turns the most expensive tool failure
 * (re-read the whole file, reconstruct, retry) into a one-shot correction.
 * Anchor: `oldString`'s first non-empty trimmed line, matched by substring
 * containment either way (goose's rule), then by best trimmed-line
 * Levenshtein similarity at ≥ 0.6. `null` when nothing plausibly matches
 * (the honest answer — a wrong hint is worse than none).
 */
export function editNotFoundHint(content: string, oldString: string): EditNotFoundHint | null {
  const anchor = oldString
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (anchor === undefined) return null;

  const lines = content.split("\n");
  let matchIndex = -1;

  for (const [i, line] of lines.entries()) {
    if (line.length > EDIT_HINT_MAX_LINE) continue;
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    if (
      line.includes(anchor) ||
      (trimmed.length >= EDIT_HINT_MIN_REVERSE_LINE && anchor.includes(trimmed))
    ) {
      matchIndex = i;
      break;
    }
  }

  if (matchIndex === -1) {
    let bestSimilarity = 0;
    for (const [i, line] of lines.entries()) {
      if (line.length > EDIT_HINT_MAX_LINE) continue;
      const trimmed = line.trim();
      if (trimmed.length === 0) continue;
      // Cheap pre-filter: a length gap alone already caps similarity below
      // the threshold, so skip the O(anchor·line) distance outright.
      const maxLen = Math.max(trimmed.length, anchor.length);
      if (Math.min(trimmed.length, anchor.length) / maxLen < EDIT_HINT_SIMILARITY) continue;
      const similarity = 1 - levenshtein(trimmed, anchor) / maxLen;
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        matchIndex = i;
      }
    }
    if (matchIndex === -1 || bestSimilarity < EDIT_HINT_SIMILARITY) return null;
  }

  // Window: the anchor line, context on both sides, and room for the rest of
  // the old_string below (that's where the model's stale lines diverge).
  const oldLineCount = oldString.split("\n").length;
  const start = Math.max(0, matchIndex - EDIT_HINT_CONTEXT_LINES);
  const end = Math.min(
    lines.length,
    Math.min(matchIndex + oldLineCount + EDIT_HINT_CONTEXT_LINES, start + EDIT_HINT_MAX_LINES),
  );
  const preview = lines
    .slice(start, end)
    .map((line, offset) => `${String(start + offset + 1).padStart(6)}|${line}`)
    .join("\n");
  return { line: matchIndex + 1, preview };
}

const BOM = "\uFEFF";

/** Strip a leading UTF-8 BOM so the cascade never has to match around it. */
export function splitBom(text: string): { bom: boolean; text: string } {
  return text.startsWith(BOM) ? { bom: true, text: text.slice(1) } : { bom: false, text };
}

/** Re-attach (or keep off) the BOM recorded by {@link splitBom}. */
export function joinBom(text: string, bom: boolean): string {
  const stripped = splitBom(text).text;
  return bom ? BOM + stripped : stripped;
}
