import { afterAll, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildCommunicationMarkdown,
  buildHitlMarkdown,
  buildLookMarkdown,
  buildRepoConventionsMarkdown,
  buildSubagentMarkdown,
  buildWorkflowMarkdown,
} from "./instructions";

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

test("workflow contract interpolates the noun and verify hint, and keeps the end-of-turn check", () => {
  const markdown = buildWorkflowMarkdown({
    workspaceNoun: "repo",
    verifyCommandHint: "bun run check",
  });
  expect(markdown).toContain("## How to work");
  expect(markdown).toContain("repo's existing patterns");
  expect(markdown).toContain("`bun run check`");
  expect(markdown).toContain("Read a file before editing it");
  expect(markdown).toContain("Finish the job before ending your turn");
  // Defaults: generic noun, no verify-command parenthetical.
  const plain = buildWorkflowMarkdown();
  expect(plain).toContain("workspace's existing patterns");
  expect(plain).not.toContain("(e.g.");
});

test("communication contract covers the load-bearing rules", () => {
  const markdown = buildCommunicationMarkdown();
  expect(markdown).toContain("## Communicating");
  expect(markdown).toContain("Lead with the outcome");
  expect(markdown).toContain("Readable beats brief");
  expect(markdown).toContain("Report, don't fix");
  expect(markdown).toContain("without asking");
  expect(markdown).toContain("faithfully");
});

test("hitl playbook teaches the structured ask_question surface", () => {
  const markdown = buildHitlMarkdown();
  expect(markdown).toContain("ask_question");
  expect(markdown).toContain("genuinely blocked");
  expect(markdown).toContain('style: "primary"');
  expect(markdown).toContain('style: "danger"');
  expect(markdown).toContain("allowFreeform: true");
  expect(markdown).toContain("description");
  // Verified by rib/evals/hitl/parallel-questions.eval.ts: parallel calls
  // collect into one park, so the playbook teaches batching.
  expect(markdown).toContain("independent questions together");
});

test("look playbook carries the oracle identity, the routing rule, and the deliverable rule", () => {
  const markdown = buildLookMarkdown({
    modelName: "Gemini 3 Flash",
    capabilities: { image: true, pdf: true, video: true, audio: true },
    parentCapabilities: { image: false, pdf: false, video: false, audio: false },
  });
  expect(markdown).toContain("## Media you can't view (look)");
  expect(markdown).toContain("Gemini 3 Flash");
  expect(markdown).toContain("can view images, PDFs, video, and audio");
  // The parent half of the routing rule names the session model's own set.
  expect(markdown).toContain("Your own model can view text only");
  expect(markdown).toContain("Ask for the deliverable");
  // Delivery claims stay with read's per-instance result notes: documents
  // convert to text (never attach), and attachments can be disabled per
  // instance — the playbook must not promise "read attaches" outright.
  expect(markdown).toContain("Documents come back as text");
  expect(markdown).toContain("its note names the right move");
  expect(markdown).not.toContain("attaches the file to your next message");
  // Without parent capabilities the sentence naming the model's set is absent.
  const generic = buildLookMarkdown({
    modelName: "Gemini 3 Flash",
    capabilities: { image: true, pdf: true, video: true, audio: true },
  });
  expect(generic).not.toContain("Your own model");
});

test("subagent playbook interpolates the workspace noun and covers the load-bearing rules", () => {
  const markdown = buildSubagentMarkdown("repo");
  expect(markdown).toContain("## Delegating with the agent tool");
  expect(markdown).toContain("same repo");
  expect(markdown).toContain("non-overlapping write scopes");
  expect(markdown).toContain("in parallel");
  // Default noun; no roster section without a roster.
  expect(buildSubagentMarkdown()).toContain("same workspace");
  expect(markdown).not.toContain("### Choosing a subagent");
});

test("a roster adds the routing section with each specialist's when", () => {
  const markdown = buildSubagentMarkdown("repo", [
    { name: "task_fast", when: "quick well-scoped subtasks on a fast model" },
    { name: "reviewer", when: "pre-merge review passes" },
  ]);
  expect(markdown).toContain("### Choosing a subagent");
  expect(markdown).toContain("- **`task_fast`** — quick well-scoped subtasks on a fast model.");
  expect(markdown).toContain("- **`reviewer`** — pre-merge review passes.");
  // Write-capable specialists share the write-scope rule; read-only ones fan out freely.
  expect(markdown).toContain("shares the non-overlapping write-scope rule");
  expect(markdown).toContain("safe to fan out freely");
  // An empty roster behaves like no roster.
  expect(buildSubagentMarkdown("repo", [])).not.toContain("### Choosing a subagent");
});
