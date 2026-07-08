// RTF → text: a small control-word interpreter. RTF is a 7-bit text format,
// so a naive text read "works" but drowns the content in `\fonttbl` tables
// and formatting words; this strips markup, skips non-content destinations,
// and decodes `\'hh` (cp1252) and `\uN` (unicode) escapes. Dependency-free.

/** Result of RTF extraction: plain text or a failure reason. */
export type RtfExtraction =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly reason: string };

// Destination groups whose content is metadata/formatting, never body text.
const SKIP_DESTINATIONS = new Set([
  "fonttbl",
  "colortbl",
  "stylesheet",
  "info",
  "pict",
  "object",
  "header",
  "footer",
  "headerl",
  "headerr",
  "headerf",
  "footerl",
  "footerr",
  "footerf",
  "ftnsep",
  "ftnsepc",
  "generator",
  "themedata",
  "colorschememapping",
  "datastore",
  "latentstyles",
  "listtable",
  "listoverridetable",
  "revtbl",
  "xmlnstbl",
  "fldinst",
]);

// Control words that emit a character instead of formatting.
const CHARACTER_WORDS = new Map<string, string>([
  ["par", "\n"],
  ["line", "\n"],
  ["tab", "\t"],
  ["emdash", "\u2014"],
  ["endash", "\u2013"],
  ["emspace", " "],
  ["enspace", " "],
  ["qmspace", " "],
  ["bullet", "\u2022"],
  ["lquote", "\u2018"],
  ["rquote", "\u2019"],
  ["ldblquote", "\u201c"],
  ["rdblquote", "\u201d"],
  ["cell", "\t"],
  ["row", "\n"],
]);

// cp1252's 0x80–0x9F block, where it differs from latin1 (the rest maps 1:1).
const CP1252_HIGH: Record<number, string> = {
  0x80: "\u20ac",
  0x82: "\u201a",
  0x83: "\u0192",
  0x84: "\u201e",
  0x85: "\u2026",
  0x86: "\u2020",
  0x87: "\u2021",
  0x88: "\u02c6",
  0x89: "\u2030",
  0x8a: "\u0160",
  0x8b: "\u2039",
  0x8c: "\u0152",
  0x8e: "\u017d",
  0x91: "\u2018",
  0x92: "\u2019",
  0x93: "\u201c",
  0x94: "\u201d",
  0x95: "\u2022",
  0x96: "\u2013",
  0x97: "\u2014",
  0x98: "\u02dc",
  0x99: "\u2122",
  0x9a: "\u0161",
  0x9b: "\u203a",
  0x9c: "\u0153",
  0x9e: "\u017e",
  0x9f: "\u0178",
};

function cp1252Char(byte: number): string {
  return CP1252_HIGH[byte] ?? String.fromCharCode(byte);
}

function isAsciiLetter(code: number): boolean {
  return (code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a);
}

function isAsciiDigit(code: number): boolean {
  return code >= 0x30 && code <= 0x39;
}

interface GroupState {
  skipped: boolean;
  /** `\ucN`: how many fallback characters follow each `\uN` escape. */
  unicodeSkip: number;
}

/** Extract RTF bytes into plain text. */
export function extractRtf(bytes: Uint8Array): RtfExtraction {
  // RTF is 7-bit ASCII with escapes; latin1 preserves raw bytes 1:1.
  const input = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("latin1");
  if (!input.startsWith("{\\rtf")) {
    return { ok: false, reason: "does not start with an {\\rtf header" };
  }
  let text = "";
  const stack: GroupState[] = [];
  let group: GroupState = { skipped: false, unicodeSkip: 1 };
  // After \uN, this many following characters (the pre-unicode fallback,
  // usually "?" or \'hh) are consumed rather than emitted.
  let pendingFallback = 0;

  const emit = (chunk: string) => {
    if (group.skipped) return;
    if (pendingFallback > 0) {
      pendingFallback--;
      return;
    }
    text += chunk;
  };

  let at = 0;
  while (at < input.length) {
    const ch = input[at];
    if (ch === "{") {
      stack.push(group);
      group = { ...group };
      at++;
      // `{\*\word …}` marks an optional destination: skip unless the word
      // is body content we'd keep anyway (none are in the skip-safe set).
      if (input.startsWith("\\*", at)) {
        group.skipped = true;
        at += 2;
      }
      continue;
    }
    if (ch === "}") {
      group = stack.pop() ?? { skipped: false, unicodeSkip: 1 };
      at++;
      continue;
    }
    if (ch !== "\\") {
      if (ch === "\n" || ch === "\r") {
        at++; // raw newlines are formatting in the source, not content
        continue;
      }
      emit(ch ?? "");
      at++;
      continue;
    }
    // Control word or control symbol. Scanned by index — slicing the
    // remainder per backslash would be quadratic on control-word-dense
    // input up to the read tool's size cap.
    let wordEnd = at + 1;
    while (wordEnd < input.length && isAsciiLetter(input.charCodeAt(wordEnd))) {
      wordEnd++;
    }
    if (wordEnd > at + 1) {
      const word = input.slice(at + 1, wordEnd);
      // Optional signed numeric parameter (needs at least one digit).
      let paramEnd = wordEnd;
      if (input.charCodeAt(paramEnd) === 0x2d /* - */) paramEnd++;
      let digitEnd = paramEnd;
      while (digitEnd < input.length && isAsciiDigit(input.charCodeAt(digitEnd))) {
        digitEnd++;
      }
      const param = digitEnd > paramEnd ? input.slice(wordEnd, digitEnd) : undefined;
      at = param === undefined ? wordEnd : digitEnd;
      if (input[at] === " ") at++; // the delimiter space belongs to the word
      if (SKIP_DESTINATIONS.has(word)) {
        group.skipped = true;
        continue;
      }
      if (word === "uc") {
        group.unicodeSkip = param === undefined ? 1 : Math.max(0, Number(param));
        continue;
      }
      if (word === "u" && param !== undefined) {
        let code = Number(param);
        if (code < 0) code += 65536;
        emit(String.fromCharCode(code));
        if (!group.skipped) pendingFallback = group.unicodeSkip;
        continue;
      }
      const mapped = CHARACTER_WORDS.get(word);
      if (mapped !== undefined) emit(mapped);
      // All other control words are formatting; drop them.
      continue;
    }
    const symbol = input[at + 1];
    if (symbol === undefined) break;
    if (symbol === "'") {
      const hex = input.slice(at + 2, at + 4);
      const byte = Number.parseInt(hex, 16);
      if (Number.isFinite(byte)) emit(cp1252Char(byte));
      at += 4;
      continue;
    }
    // Escaped literals and one-character symbols.
    if (symbol === "\\" || symbol === "{" || symbol === "}") emit(symbol);
    else if (symbol === "~") emit("\u00a0");
    else if (symbol === "_") emit("-");
    else if (symbol === "\n" || symbol === "\r") emit("\n");
    at += 2;
  }
  // Collapse the trailing paragraph break RTF writers leave before `}`.
  return { ok: true, text: text.replace(/\n+$/, "") };
}
