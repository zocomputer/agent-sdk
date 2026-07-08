// Example specs for the forgiving-edit cascade: one table per replacer (the
// case it exists for), the replace-loop semantics (uniqueness, replace_all,
// `$&`-safety), the disproportionate-match guard, the typed errors, and BOM
// split/join. The property suite (edit-match.property.test.ts) is the
// coverage backstop; these are the readable, named cases.

import { describe, expect, test } from "bun:test";
import {
  BlockAnchorReplacer,
  ContextAwareReplacer,
  EditDisproportionateError,
  EditNotFoundError,
  editNotFoundHint,
  EditNotUniqueError,
  EscapeNormalizedReplacer,
  IndentationFlexibleReplacer,
  isDisproportionateMatch,
  joinBom,
  LineTrimmedReplacer,
  MultiOccurrenceReplacer,
  replaceForgiving,
  SimpleReplacer,
  splitBom,
  TrimmedBoundaryReplacer,
  WhitespaceNormalizedReplacer,
} from "./edit-match";

describe("replaceForgiving — exact matches (simple)", () => {
  test("byte-identity with naive split/join for a unique exact match", () => {
    const content = "const a = 1;\nconst b = 2;\nconst c = 3;\n";
    const result = replaceForgiving(content, "const b = 2;", "const b = 20;");
    expect(result.content).toBe(content.split("const b = 2;").join("const b = 20;"));
    expect(result.matched).toBe("simple");
    expect(result.replacements).toBe(1);
  });

  test("replace_all replaces every exact occurrence", () => {
    const result = replaceForgiving("x y x z x", "x", "X", true);
    expect(result.content).toBe("X y X z X");
    expect(result.matched).toBe("simple");
    expect(result.replacements).toBe(3);
  });

  test("new_string containing $& is inserted literally, never as a substitution pattern", () => {
    const single = replaceForgiving("value = OLD;", "OLD", "$& $' $1 $$");
    expect(single.content).toBe("value = $& $' $1 $$;");
    const all = replaceForgiving("OLD and OLD", "OLD", "$&", true);
    expect(all.content).toBe("$& and $&");
  });
});

describe("replaceForgiving — errors", () => {
  test("not found", () => {
    expect(() => replaceForgiving("alpha beta", "gamma", "delta")).toThrow(EditNotFoundError);
  });

  test("ambiguous match without replace_all", () => {
    expect(() => replaceForgiving("dup\ndup\n", "dup", "DUP")).toThrow(EditNotUniqueError);
  });

  test("identical old and new", () => {
    expect(() => replaceForgiving("same", "same", "same")).toThrow(/identical/);
  });

  test("empty old_string", () => {
    expect(() => replaceForgiving("content", "", "new")).toThrow(/cannot be empty/);
  });

  test("all-whitespace old_string cannot inject between every character", () => {
    // TrimmedBoundary trims "   " to "" — an empty candidate must be skipped,
    // not treated as occurring everywhere.
    expect(() => replaceForgiving("abc", "   ", "X", true)).toThrow(EditNotFoundError);
  });
});

describe("LineTrimmedReplacer (via cascade)", () => {
  test("plain substring of an indented line matches exactly (simple), keeping the indentation", () => {
    const content = "if (ok) {\n    doThing();\n}\n";
    const result = replaceForgiving(content, "doThing();", "doOther();");
    expect(result.content).toBe("if (ok) {\n    doOther();\n}\n");
    expect(result.matched).toBe("simple");
  });

  test("wrong indentation style (tab vs spaces) falls through to line_trimmed", () => {
    const content = "if (ok) {\n    doThing();\n}\n";
    // The model remembered a tab indent; the file uses four spaces, so the
    // exact match fails. line_trimmed resolves to the whole original line,
    // which new_string then replaces (bringing its own indentation).
    const result = replaceForgiving(content, "\tdoThing();", "\tdoOther();");
    expect(result.content).toBe("if (ok) {\n\tdoOther();\n}\n");
    expect(result.matched).toBe("line_trimmed");
  });

  test("re-indented multi-line old_string lands on the original block", () => {
    const content = "function f() {\n  const a = 1;\n  return a;\n}\n";
    const find = "    const a = 1;\n    return a;";
    const result = replaceForgiving(content, find, "  return 1;");
    expect(result.content).toBe("function f() {\n  return 1;\n}\n");
    expect(result.matched).toBe("line_trimmed");
  });

  test("trailing empty line on old_string is tolerated", () => {
    // "  b\n" is not an exact substring (the file indents with a tab), so
    // line_trimmed pops the trailing empty line and matches the line trimmed.
    const content = "a\n\tb\nc\n";
    const result = replaceForgiving(content, "  b\n", "B");
    expect(result.content).toBe("a\nB\nc\n");
    expect(result.matched).toBe("line_trimmed");
  });
});

describe("BlockAnchorReplacer", () => {
  test("cascade: correct anchors with a slightly-wrong middle line resolve to the original block", () => {
    const content = "function total(items) {\n  const sum = items.reduce((acc, x) => acc + x.price, 0);\n  return sum;\n}\n";
    // Middle line remembered slightly wrong (missing `, 0` seed).
    const find = "function total(items) {\n  const sum = items.reduce((acc, x) => acc + x.price);\n  return sum;\n}";
    const result = replaceForgiving(content, find, "function total(items) {\n  return sumBy(items, 'price');\n}");
    expect(result.content).toBe("function total(items) {\n  return sumBy(items, 'price');\n}\n");
    expect(result.matched).toBe("block_anchor");
  });

  test("requires at least 3 lines", () => {
    expect([...BlockAnchorReplacer("a\nb\na\nb", "a\nb")]).toEqual([]);
  });

  test("dissimilar middle lines stay below the 0.65 threshold", () => {
    const content = "start\ncompletely different middle content here\nend\n";
    const find = "start\nzzzzzz\nend";
    expect([...BlockAnchorReplacer(content, find)]).toEqual([]);
  });

  test("multiple candidates pick the most similar block", () => {
    const content = "anchor {\n  aaaa bbbb\n}\nanchor {\n  aaaa cccc\n}\n";
    const find = "anchor {\n  aaaa cccd\n}";
    const spans = [...BlockAnchorReplacer(content, find)];
    expect(spans).toEqual(["anchor {\n  aaaa cccc\n}"]);
  });
});

describe("WhitespaceNormalizedReplacer (via cascade)", () => {
  test("collapsed inner whitespace still matches", () => {
    const content = "const x    =    1;\n";
    const result = replaceForgiving(content, "const x = 1;", "const x = 2;");
    expect(result.content).toBe("const x = 2;\n");
    expect(result.matched).toBe("whitespace_normalized");
  });

  test("tabs in the file match spaces in old_string", () => {
    const content = "\tif (a)\t{ go(); }\n";
    const result = replaceForgiving(content, "if (a) { go(); }", "if (b) { go(); }");
    // The whole-line span (leading tab included) is what gets replaced —
    // new_string supplies the final indentation. Faithful opencode behavior.
    expect(result.content).toBe("if (b) { go(); }\n");
    expect(result.matched).toBe("whitespace_normalized");
  });

  test("substring-of-line match recovers the exact original span", () => {
    const spans = [...WhitespaceNormalizedReplacer("pre foo   bar post", "foo bar")];
    expect(spans).toContain("foo   bar");
  });
});

describe("IndentationFlexibleReplacer (direct — shadowed in-cascade by line_trimmed)", () => {
  test("common indent removed on both sides matches, preserving relative indentation", () => {
    const content = "    if (x) {\n      y();\n    }\n";
    const find = "if (x) {\n  y();\n}";
    const spans = [...IndentationFlexibleReplacer(content, find)];
    expect(spans).toEqual(["    if (x) {\n      y();\n    }"]);
  });

  test("relative indentation mismatch does not match", () => {
    const content = "    if (x) {\n    y();\n    }\n";
    const find = "if (x) {\n    y();\n}";
    expect([...IndentationFlexibleReplacer(content, find)]).toEqual([]);
  });
});

describe("EscapeNormalizedReplacer (via cascade)", () => {
  test("double-escaped newline in old_string matches the real newline in the file", () => {
    const content = 'const s = "a";\nconst t = "b";\n';
    const result = replaceForgiving(content, 'const s = "a";\\nconst t = "b";', 'const s = "ab";');
    expect(result.content).toBe('const s = "ab";\n');
    expect(result.matched).toBe("escape_normalized");
  });

  test("escaped quotes and tabs unescape before comparing", () => {
    const spans = [...EscapeNormalizedReplacer("say \"hi\"\tnow", 'say \\"hi\\"\\tnow')];
    expect(spans).toContain('say "hi"\tnow');
  });
});

describe("TrimmedBoundaryReplacer (via cascade)", () => {
  test("old_string with stray surrounding whitespace matches the trimmed span", () => {
    // Stray spaces (not present in the file) around the real text — an exact
    // match fails, the trimmed candidate lands.
    const content = "alpha\nbeta gamma\ndelta\n";
    const result = replaceForgiving(content, "  beta gamma  ", "beta GAMMA");
    expect(result.content).toBe("alpha\nbeta GAMMA\ndelta\n");
    // line_trimmed also absorbs pure-boundary whitespace; either strategy is
    // acceptable, the outcome is what's pinned. Direct generator test below.
    expect(["trimmed_boundary", "line_trimmed"]).toContain(result.matched);
  });

  test("yields nothing when old_string is already trimmed", () => {
    expect([...TrimmedBoundaryReplacer("beta", "beta")]).toEqual([]);
  });

  test("direct: yields the trimmed find when present", () => {
    expect([...TrimmedBoundaryReplacer("x beta y", "  beta  ")]).toContain("beta");
  });
});

describe("ContextAwareReplacer (direct — usually shadowed by block_anchor)", () => {
  test("exact anchors + half-right middle lines match the block", () => {
    const content = "begin\none\nTWO\nthree\nend\n";
    const find = "begin\none\ntwo-remembered-wrong\nthree\nend";
    const spans = [...ContextAwareReplacer(content, find)];
    expect(spans).toEqual(["begin\none\nTWO\nthree\nend"]);
  });

  test("block length must equal the find's", () => {
    const content = "begin\none\ntwo\nthree\nextra\nend\n";
    const find = "begin\none\ntwo\nend";
    expect([...ContextAwareReplacer(content, find)]).toEqual([]);
  });

  test("under half the middle lines matching does not match", () => {
    const content = "begin\nAAA\nBBB\nCCC\nend\n";
    const find = "begin\nxxx\nyyy\nCCC\nend";
    expect([...ContextAwareReplacer(content, find)]).toEqual([]);
  });
});

describe("SimpleReplacer / MultiOccurrenceReplacer (direct)", () => {
  test("simple yields the find verbatim once", () => {
    expect([...SimpleReplacer("anything", "find me")]).toEqual(["find me"]);
  });

  test("multi_occurrence yields one candidate per exact occurrence", () => {
    expect([...MultiOccurrenceReplacer("x.x.x", "x")]).toEqual(["x", "x", "x"]);
    expect([...MultiOccurrenceReplacer("none here", "x")]).toEqual([]);
  });
});

describe("disproportionate-match guard", () => {
  test("thresholds (verbatim from opencode)", () => {
    // Line rule: search >= max(oldLines + 3, oldLines * 2) lines.
    expect(isDisproportionateMatch("a\nb\nc\nd", "a")).toBe(true); // 4 >= max(4, 2)
    expect(isDisproportionateMatch("a\nb\nc", "a")).toBe(false); // 3 < 4, single-line old exempt from char rule
    // Char rule only applies to multi-line old_strings.
    expect(isDisproportionateMatch("x".repeat(600), "y")).toBe(false);
    expect(isDisproportionateMatch(`${"x".repeat(600)}\nb`, "a\nb")).toBe(true); // > max(3+500, 12)
    expect(isDisproportionateMatch("aaaa\nb", "a\nb")).toBe(false);
  });

  test("cascade refuses when escape-normalization explodes a one-line old_string into a block", () => {
    // old_string is one line of literal \n escapes; the unescaped candidate
    // spans 4 real lines — much larger than what the model asked to replace.
    const content = "a\nb\nc\nd\n";
    expect(() => replaceForgiving(content, "a\\nb\\nc\\nd", "X")).toThrow(EditDisproportionateError);
  });
});

describe("editNotFoundHint", () => {
  const content = [
    "import { a } from './a';",
    "",
    "export function greet(name: string) {",
    "  const message = `hi ${name}`;",
    "  return message;",
    "}",
    "",
    "export function farewell(name: string) {",
    "  return `bye ${name}`;",
    "}",
  ].join("\n");

  test("anchors on the first line by containment and returns a numbered window", () => {
    // Stale middle line (the model remembered an old body) — the anchor line
    // still exists verbatim, so the hint points at the greet block.
    const hint = editNotFoundHint(content, "export function greet(name: string) {\n  const msg = name;\n}");
    expect(hint).not.toBeNull();
    expect(hint?.line).toBe(3);
    expect(hint?.preview).toContain("     3|export function greet(name: string) {");
    expect(hint?.preview).toContain("     4|  const message = `hi ${name}`;");
  });

  test("skips a blank first line and anchors on the first non-empty one", () => {
    const hint = editNotFoundHint(content, "\n  return message;\nnope");
    expect(hint?.line).toBe(5);
  });

  test("falls back to fuzzy line similarity when containment misses", () => {
    // One typo in the anchor line ("greeet") — no containment either way,
    // but Levenshtein similarity clears the 0.6 bar.
    const hint = editNotFoundHint(content, "export function greeet(name: string) {\nnope");
    expect(hint?.line).toBe(3);
  });

  test("returns null when nothing plausibly matches", () => {
    expect(editNotFoundHint(content, "completely unrelated text 12345")).toBeNull();
    expect(editNotFoundHint(content, "   \n  \n")).toBeNull();
    expect(editNotFoundHint("", "anything")).toBeNull();
  });

  test("a trivial short line does not reverse-contain into a bogus anchor", () => {
    // goose's raw rule would anchor "export function totallyNew() {" on the
    // first "}" line (the anchor contains it); the reverse-containment floor
    // refuses, and no other line clears the fuzzy bar → honest null.
    expect(editNotFoundHint("}\n}\n}", "export function totallyNew() {\n  body\n}")).toBeNull();
  });

  test("length-disparate lines skip the fuzzy fallback (no false anchor)", () => {
    // A long minified-style line shares characters with the anchor but the
    // length-ratio pre-filter (and the 500-char cap) keeps it from matching.
    const minified = `const x = ${"a".repeat(600)};`;
    expect(editNotFoundHint(minified, "const y = 1;\nnope")).toBeNull();
  });

  test("caps the window at 20 lines for a huge old_string", () => {
    const big = Array.from({ length: 60 }, (_, i) => `line ${i}`).join("\n");
    const hint = editNotFoundHint(big, `line 5\n${"x\n".repeat(50)}`);
    expect(hint).not.toBeNull();
    expect(hint?.preview.split("\n").length).toBeLessThanOrEqual(20);
  });
});

describe("BOM split/join", () => {
  test("splitBom strips a leading BOM and reports it", () => {
    expect(splitBom("\uFEFFhello")).toEqual({ bom: true, text: "hello" });
    expect(splitBom("hello")).toEqual({ bom: false, text: "hello" });
  });

  test("joinBom round-trips and never doubles a BOM", () => {
    expect(joinBom("hello", true)).toBe("\uFEFFhello");
    expect(joinBom("\uFEFFhello", true)).toBe("\uFEFFhello");
    expect(joinBom("\uFEFFhello", false)).toBe("hello");
    expect(joinBom("hello", false)).toBe("hello");
  });
});
