import { afterAll, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildRepoConventionsMarkdown } from "./instructions";

const dir = mkdtempSync(join(tmpdir(), "stdlib-instructions-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

test("wraps the root AGENTS.md in a conventions section", () => {
  const root = join(dir, "with-agents");
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), "# Contents\n\n- stuff\n");
  const markdown = buildRepoConventionsMarkdown(root);
  expect(markdown).toContain("## Repository conventions (root AGENTS.md)");
  expect(markdown).toContain("<root-agents-md>\n# Contents\n\n- stuff\n</root-agents-md>");
});

test("returns empty string when AGENTS.md is absent or empty", () => {
  expect(buildRepoConventionsMarkdown(join(dir, "nope"))).toBe("");
  const empty = join(dir, "empty-agents");
  mkdirSync(empty, { recursive: true });
  writeFileSync(join(empty, "AGENTS.md"), "   \n");
  expect(buildRepoConventionsMarkdown(empty)).toBe("");
});
