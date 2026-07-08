// Property tests for the forgiving-edit cascade — the laws a named example
// list can't guarantee:
//   1. Exactness: a unique exact old_string replaces byte-identically to
//      naive split/join, via `simple` — forgiveness never distorts the case
//      that was already right.
//   2. Forgiveness: the perturbations the cascade exists for (uniformly
//      re-indented, whitespace-collapsed, double-escaped old_strings) land on
//      the intended span and leave every other byte of the file untouched.
//   3. Totality: arbitrary input triples either return an in-contract result
//      or throw one of the typed/precondition errors — never anything else.
//   4. Uniqueness: a duplicated target is refused without replace_all and
//      fully replaced with it.
// BOM split/join round-trips ride along. Generators are model-first: unique
// tokens by construction (index-embedded names, marker chars excluded from
// context alphabets), so uniqueness holds without filtering. The sibling
// edit-match.test.ts carries the readable named cases.

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import {
  EditDisproportionateError,
  EditNotFoundError,
  EditNotUniqueError,
  joinBom,
  replaceForgiving,
  splitBom,
} from "./edit-match";

const STRATEGIES = [
  "simple",
  "line_trimmed",
  "block_anchor",
  "whitespace_normalized",
  "indentation_flexible",
  "escape_normalized",
  "trimmed_boundary",
  "context_aware",
  "multi_occurrence",
];

// noUncheckedIndexedAccess guard for reads that are in-bounds by construction.
function req<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("index out of bounds in test setup");
  return value;
}

// Short decorations appended to index-embedded token names; digit-free so the
// index alone pins each token's identity.
const suffixArb = fc.string({ maxLength: 3, unit: fc.constantFrom(..."abc") });

describe("replaceForgiving properties", () => {
  test("exactness: a unique exact old_string replaces byte-identically via simple", () => {
    // The marker carries the only Z in the content (contexts are Z-free), so
    // it occurs exactly once by construction.
    const ctxArb = fc.string({ maxLength: 30, unit: fc.constantFrom(..."ab \n\t(){};=") });
    const markerPartArb = fc.string({ maxLength: 8, unit: fc.constantFrom(..."ab \n") });
    fc.assert(
      fc.property(
        ctxArb,
        ctxArb,
        markerPartArb,
        markerPartArb,
        ctxArb,
        (pre, post, markerHead, markerTail, replacement) => {
          const marker = `${markerHead}Z${markerTail}`;
          fc.pre(replacement !== marker);
          const content = pre + marker + post;
          const result = replaceForgiving(content, marker, replacement);
          expect(result.content).toBe(pre + replacement + post);
          expect(result.matched).toBe("simple");
          expect(result.replacements).toBe(1);
        },
      ),
    );
  });

  test("forgiveness: a uniformly re-indented old_string lands on the original block", () => {
    fc.assert(
      fc.property(
        fc.array(suffixArb, { minLength: 1, maxLength: 8 }),
        fc.nat(),
        fc.nat(),
        (suffixes, startRaw, lenRaw) => {
          const lines = suffixes.map((s, i) => `tok${i}${s}`);
          const start = startRaw % lines.length;
          const len = 1 + (lenRaw % (lines.length - start));
          const content = `${lines.join("\n")}\n`;
          const window = lines.slice(start, start + len);
          // The model remembered the block with two extra spaces of indent;
          // the file has none, so an exact match is impossible.
          const old = window.map((line) => `  ${line}`).join("\n");
          const result = replaceForgiving(content, old, "@@new@@");
          const span = window.join("\n");
          const at = content.indexOf(span);
          expect(result.matched).toBe("line_trimmed");
          expect(result.content).toBe(
            content.slice(0, at) + "@@new@@" + content.slice(at + span.length),
          );
        },
      ),
    );
  });

  test("forgiveness: collapsed inner whitespace lands on the original line", () => {
    fc.assert(
      fc.property(
        fc.array(fc.array(suffixArb, { minLength: 2, maxLength: 4 }), {
          minLength: 1,
          maxLength: 5,
        }),
        fc.nat(),
        (lineWordSuffixes, targetRaw) => {
          const target = targetRaw % lineWordSuffixes.length;
          // Every word is globally unique (line and column indices embedded);
          // the file joins words with double spaces, the model remembered
          // single spaces.
          const lines = lineWordSuffixes.map((words, i) =>
            words.map((s, j) => `w${i}x${j}${s}`).join("  "),
          );
          const content = `${lines.join("\n")}\n`;
          const old = req(lineWordSuffixes[target])
            .map((s, j) => `w${target}x${j}${s}`)
            .join(" ");
          const result = replaceForgiving(content, old, "@@new@@");
          const span = req(lines[target]);
          const at = content.indexOf(span);
          expect(result.matched).toBe("whitespace_normalized");
          expect(result.content).toBe(
            content.slice(0, at) + "@@new@@" + content.slice(at + span.length),
          );
        },
      ),
    );
  });

  test("forgiveness: a double-escaped multi-line old_string lands on the real lines", () => {
    fc.assert(
      fc.property(
        fc.array(suffixArb, { minLength: 2, maxLength: 6 }),
        fc.nat(),
        fc.integer({ min: 2, max: 3 }),
        (suffixes, startRaw, lenWanted) => {
          const lines = suffixes.map((s, i) => `esc${i}${s}`);
          // Window of 2–3 lines: the unescaped candidate for a one-line
          // old_string trips the disproportionate guard at 4+ lines.
          const start = startRaw % (lines.length - 1);
          const len = Math.min(lenWanted, lines.length - start);
          const window = lines.slice(start, start + len);
          const old = window.join("\\n"); // literal backslash-n, one physical line
          const content = `${lines.join("\n")}\n`;
          const result = replaceForgiving(content, old, "@@new@@");
          const span = window.join("\n");
          const at = content.indexOf(span);
          expect(result.matched).toBe("escape_normalized");
          expect(result.content).toBe(
            content.slice(0, at) + "@@new@@" + content.slice(at + span.length),
          );
        },
      ),
    );
  });

  test("totality: arbitrary inputs succeed in-contract or throw a typed error", () => {
    const messyArb = fc.oneof(
      fc.string({ maxLength: 60 }),
      fc.string({ maxLength: 60, unit: fc.constantFrom(..."ab \t\n\\'\"`$&") }),
    );
    fc.assert(
      fc.property(messyArb, messyArb, messyArb, fc.boolean(), (content, oldStr, newStr, all) => {
        try {
          const result = replaceForgiving(content, oldStr, newStr, all);
          expect(STRATEGIES).toContain(result.matched);
          expect(result.replacements).toBeGreaterThanOrEqual(1);
          if (!all) expect(result.replacements).toBe(1);
        } catch (error) {
          const typed =
            error instanceof EditNotFoundError ||
            error instanceof EditNotUniqueError ||
            error instanceof EditDisproportionateError;
          const precondition =
            error instanceof Error && /identical|cannot be empty/.test(error.message);
          expect(typed || precondition).toBe(true);
        }
      }),
      { numRuns: 300 },
    );
  });

  test("uniqueness: a duplicated target is ambiguous without replace_all, fully replaced with it", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 12, unit: fc.constantFrom(..."ab ({;") }),
        (tok) => {
          const content = `${tok}\n${tok}\n`;
          expect(() => replaceForgiving(content, tok, "@@new@@")).toThrow(EditNotUniqueError);
          const all = replaceForgiving(content, tok, "@@new@@", true);
          const parts = content.split(tok);
          expect(all.content).toBe(parts.join("@@new@@"));
          expect(all.replacements).toBe(parts.length - 1);
          expect(all.replacements).toBeGreaterThanOrEqual(2);
        },
      ),
    );
  });
});

describe("BOM properties", () => {
  test("splitBom/joinBom round-trip", () => {
    // BOM-free bodies by construction; splitBom strips at most one BOM, so
    // the round-trip law is stated over 0-or-1-leading-BOM strings.
    const bodyArb = fc.string({ maxLength: 12, unit: fc.constantFrom(..."abc \n") });
    fc.assert(
      fc.property(bodyArb, fc.boolean(), fc.boolean(), (body, hadBom, wantBom) => {
        const original = (hadBom ? "\uFEFF" : "") + body;
        const split = splitBom(original);
        expect(split).toEqual({ bom: hadBom, text: body });
        expect(joinBom(split.text, split.bom)).toBe(original);
        expect(splitBom(joinBom(original, wantBom))).toEqual({ bom: wantBom, text: body });
      }),
    );
  });
});
