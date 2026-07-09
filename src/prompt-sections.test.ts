import { describe, expect, test } from "bun:test";

import {
  composePromptSections,
  renderPromptSection,
  renderPromptSections,
  type PromptSection,
} from "./prompt-sections";

const section = (id: string, body = `${id} body`): PromptSection => ({
  id,
  heading: id.toUpperCase(),
  body,
});

describe("renderPromptSection", () => {
  test("renders heading + body", () => {
    expect(renderPromptSection(section("workflow", "Do the work."))).toBe(
      "## WORKFLOW\n\nDo the work.",
    );
  });

  test("trims the body", () => {
    expect(renderPromptSection(section("a", "\n  text  \n"))).toBe("## A\n\ntext");
  });

  test("empty body renders nothing", () => {
    expect(renderPromptSection(section("a", ""))).toBe("");
    expect(renderPromptSection(section("a", "   \n  "))).toBe("");
  });
});

describe("renderPromptSections", () => {
  test("joins non-empty sections with blank lines", () => {
    const markdown = renderPromptSections([
      section("a", "first"),
      section("b", ""),
      section("c", "third"),
    ]);
    expect(markdown).toBe("## A\n\nfirst\n\n## C\n\nthird");
  });

  test("all-empty input renders the empty string", () => {
    expect(renderPromptSections([section("a", ""), section("b", " ")])).toBe("");
  });
});

describe("composePromptSections", () => {
  const baseline = [section("one"), section("two"), section("three")];

  test("no options returns the baseline order", () => {
    expect(composePromptSections(baseline).map((s) => s.id)).toEqual([
      "one",
      "two",
      "three",
    ]);
  });

  test("omit drops baseline sections by id", () => {
    expect(
      composePromptSections(baseline, { omit: ["two"] }).map((s) => s.id),
    ).toEqual(["one", "three"]);
  });

  test("unknown omit ids are ignored", () => {
    expect(
      composePromptSections(baseline, { omit: ["nope"] }).map((s) => s.id),
    ).toEqual(["one", "two", "three"]);
  });

  test("extra with { after } lands after its anchor", () => {
    const composed = composePromptSections(baseline, {
      extras: [{ section: section("x"), placement: { after: "one" } }],
    });
    expect(composed.map((s) => s.id)).toEqual(["one", "x", "two", "three"]);
  });

  test("extra with { before } lands before its anchor", () => {
    const composed = composePromptSections(baseline, {
      extras: [{ section: section("x"), placement: { before: "three" } }],
    });
    expect(composed.map((s) => s.id)).toEqual(["one", "two", "x", "three"]);
  });

  test("extra without placement appends at the end", () => {
    const composed = composePromptSections(baseline, {
      extras: [{ section: section("x") }],
    });
    expect(composed.map((s) => s.id)).toEqual(["one", "two", "three", "x"]);
  });

  test("unknown anchor degrades to appending, never throws", () => {
    const composed = composePromptSections(baseline, {
      extras: [{ section: section("x"), placement: { after: "missing" } }],
    });
    expect(composed.map((s) => s.id)).toEqual(["one", "two", "three", "x"]);
  });

  test("extra anchored to an omitted section appends at the end", () => {
    const composed = composePromptSections(baseline, {
      omit: ["two"],
      extras: [{ section: section("x"), placement: { after: "two" } }],
    });
    expect(composed.map((s) => s.id)).toEqual(["one", "three", "x"]);
  });

  test("multiple extras on one anchor keep their given order", () => {
    const composed = composePromptSections(baseline, {
      extras: [
        { section: section("x"), placement: { after: "one" } },
        { section: section("y"), placement: { after: "one" } },
      ],
    });
    expect(composed.map((s) => s.id)).toEqual(["one", "x", "y", "two", "three"]);
  });

  test("before + after extras on the same anchor bracket it", () => {
    const composed = composePromptSections(baseline, {
      extras: [
        { section: section("x"), placement: { before: "two" } },
        { section: section("y"), placement: { after: "two" } },
      ],
    });
    expect(composed.map((s) => s.id)).toEqual(["one", "x", "two", "y", "three"]);
  });

  test("does not mutate the baseline", () => {
    const before = baseline.map((s) => s.id);
    composePromptSections(baseline, {
      omit: ["one"],
      extras: [{ section: section("x"), placement: { after: "two" } }],
    });
    expect(baseline.map((s) => s.id)).toEqual(before);
  });
});
