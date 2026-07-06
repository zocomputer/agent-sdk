// Property tests for the glob matcher: `globToRegExp` agrees with an
// independent recursive segment matcher on every generated (glob, path) pair
// (including regex metacharacters, which must stay literal), and a path
// constructed to satisfy a glob always matches. Generators stay in the
// documented domain: `/`-separated segments, `*`/`?` within a segment, and
// `**/` spanning whole directory runs.

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { globToRegExp } from "./glob-match";

// Independent reference: recursive matching over segments, no regexes.
function segmentMatches(pattern: string, segment: string): boolean {
  if (pattern === "") return segment === "";
  const head = pattern[0];
  if (head === "*") {
    return (
      segmentMatches(pattern.slice(1), segment) ||
      (segment !== "" && segmentMatches(pattern, segment.slice(1)))
    );
  }
  if (head === "?") return segment !== "" && segmentMatches(pattern.slice(1), segment.slice(1));
  return segment !== "" && segment[0] === head && segmentMatches(pattern.slice(1), segment.slice(1));
}

function referenceMatches(globSegments: readonly string[], pathSegments: readonly string[]): boolean {
  const [head, ...rest] = globSegments;
  if (head === undefined) return pathSegments.length === 0;
  if (head === "**") {
    for (let skip = 0; skip <= pathSegments.length; skip += 1) {
      if (referenceMatches(rest, pathSegments.slice(skip))) return true;
    }
    return false;
  }
  const [first, ...tail] = pathSegments;
  if (first === undefined) return false;
  return segmentMatches(head, first) && referenceMatches(rest, tail);
}

// Segment alphabets deliberately include regex metacharacters (".", "+", "(",
// "$") so an escaping bug can't hide, and overlap between glob and path chars
// keeps the match rate high.
const globSegmentArb = fc
  .string({
    minLength: 1,
    maxLength: 6,
    unit: fc.constantFrom(..."ab.+($*?"),
  })
  // "**" inside a segment is the directory-spanning form, which the domain
  // only admits as a whole segment (`**/…`), never embedded (`a**b`).
  .filter((s) => !s.includes("**"));
const pathSegmentArb = fc.string({
  minLength: 1,
  maxLength: 6,
  unit: fc.constantFrom(..."ab.+($c"),
});

// A glob is segments where `**` only ever appears as a whole segment (the
// documented "spans directories" form, always `**/…` or `…/**/…`).
const globSegmentsArb = fc
  .array(fc.oneof({ weight: 3, arbitrary: globSegmentArb }, fc.constant("**")), {
    minLength: 1,
    maxLength: 4,
  })
  // A trailing bare "**" (nothing after it) is outside the documented usage.
  .filter((segments) => segments[segments.length - 1] !== "**");

// minLength 1: the empty path is out of the matcher's domain (listings never
// yield one), and it's where the segment models diverge — zero segments here
// vs. `""` reading as one empty segment to the regex (`*` → `[^/]*` matches "").
const pathSegmentsArb = fc.array(pathSegmentArb, { minLength: 1, maxLength: 5 });

describe("globToRegExp properties", () => {
  test("agrees with the recursive reference matcher on arbitrary pairs", () => {
    fc.assert(
      fc.property(globSegmentsArb, pathSegmentsArb, (globSegments, pathSegments) => {
        const glob = globSegments.join("/");
        const path = pathSegments.join("/");
        expect(globToRegExp(glob).test(path)).toBe(referenceMatches(globSegments, pathSegments));
      }),
    );
  });

  test("a path constructed to satisfy the glob always matches", () => {
    // Model-first: build the glob and a conforming path together.
    const conformingArb = globSegmentsArb.chain((globSegments) =>
      fc
        .tuple(
          ...globSegments.map((segment) =>
            segment === "**"
              ? fc.array(pathSegmentArb, { maxLength: 2 })
              : fc
                  .array(fc.constantFrom(..."ab.+($c"), { minLength: 1, maxLength: 3 })
                  .map((fill) => {
                    let i = 0;
                    return [
                      segment
                        .split("")
                        .map((ch) => {
                          if (ch === "*") {
                            const chunk = fill.slice(0, (i += 1) % (fill.length + 1)).join("");
                            return chunk;
                          }
                          if (ch === "?") return fill[i++ % fill.length] ?? "c";
                          return ch;
                        })
                        .join(""),
                    ];
                  }),
          ),
        )
        .map((parts) => ({
          glob: globSegments.join("/"),
          path: parts.flat().join("/"),
        })),
    );
    fc.assert(
      fc.property(conformingArb, ({ glob, path }) => {
        expect(globToRegExp(glob).test(path)).toBe(true);
      }),
    );
  });

  test("a glob with no wildcards matches exactly itself", () => {
    const literalArb = fc.array(
      fc.string({ minLength: 1, maxLength: 6, unit: fc.constantFrom(..."ab.+($c") }),
      { minLength: 1, maxLength: 4 },
    );
    fc.assert(
      fc.property(literalArb, pathSegmentsArb, (literalSegments, otherSegments) => {
        const literal = literalSegments.join("/");
        const regex = globToRegExp(literal);
        expect(regex.test(literal)).toBe(true);
        const other = otherSegments.join("/");
        expect(regex.test(other)).toBe(other === literal);
      }),
    );
  });
});
