import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildCommunicationMarkdown,
  buildHitlMarkdown,
  buildInstructionStackMarkdown,
  buildInstructionStackSections,
  buildLookMarkdown,
  buildParallelToolsMarkdown,
  buildPlanningMarkdown,
  buildRepoConventionsMarkdown,
  buildSubagentMarkdown,
  buildWorkflowMarkdown,
  INSTRUCTION_STACK_SECTION_IDS,
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

test("workflow contract requires reproduction-first bug fixing", () => {
  const markdown = buildWorkflowMarkdown();
  expect(markdown).toContain("Reproduce a bug before you fix it");
  expect(markdown).toContain("minimal reproduction");
  expect(markdown).toContain("confirm the failure");
  expect(markdown).toContain("re-run the reproduction");
});

test("planning playbook covers the todo status discipline", () => {
  const markdown = buildPlanningMarkdown();
  expect(markdown).toContain("## Planning your work (todo)");
  expect(markdown).toContain("`in_progress`");
  expect(markdown).toContain("`completed`");
  expect(markdown).toContain("`cancelled`");
  expect(markdown).toContain("replaces the whole list");
  expect(markdown).toContain("specific and verifiable");
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
  const markdown = buildSubagentMarkdown({ workspaceNoun: "repo" });
  expect(markdown).toContain("## Delegating with the agent tool");
  expect(markdown).toContain("same repo");
  expect(markdown).toContain("non-overlapping write scopes");
  expect(markdown).toContain("in parallel");
  // Default noun; no roster section without a roster.
  expect(buildSubagentMarkdown()).toContain("same workspace");
  expect(markdown).not.toContain("### Choosing a subagent");
});

test("a roster adds the routing section with each specialist's when", () => {
  const markdown = buildSubagentMarkdown({
    workspaceNoun: "repo",
    roster: [
      { name: "task_fast", when: "quick well-scoped subtasks on a fast model" },
      { name: "reviewer", when: "pre-merge review passes" },
    ],
  });
  expect(markdown).toContain("### Choosing a subagent");
  expect(markdown).toContain("- **`task_fast`** — quick well-scoped subtasks on a fast model.");
  expect(markdown).toContain("- **`reviewer`** — pre-merge review passes.");
  // Write-capable specialists share the write-scope rule; read-only ones fan out freely.
  expect(markdown).toContain("shares the non-overlapping write-scope rule");
  expect(markdown).toContain("safe to fan out freely");
  // An empty roster behaves like no roster.
  expect(buildSubagentMarkdown({ workspaceNoun: "repo", roster: [] })).not.toContain(
    "### Choosing a subagent",
  );
});

describe("compact tier", () => {
  // The tier contract: compact keeps every load-bearing rule and tool name,
  // just without the elaboration — so the same token assertions must hold in
  // both tiers, and compact must be meaningfully shorter. Authored side by
  // side in one builder precisely so this parity is testable.
  const oracle = {
    modelName: "Gemini 3 Flash",
    capabilities: { image: true, pdf: true, video: true, audio: true },
  } as const;
  const roster = [{ name: "task_fast", when: "quick subtasks" }] as const;

  const cases: readonly {
    name: string;
    render: (tier: "full" | "compact") => string;
    tokens: readonly string[];
  }[] = [
    {
      name: "workflow",
      render: (tier) =>
        buildWorkflowMarkdown({ workspaceNoun: "repo", verifyCommandHint: "bun run check", tier }),
      tokens: [
        "`glob`",
        "`grep`",
        "`edit`",
        "`write`",
        "`todo`",
        "`bun run check`",
        "reproduction",
        "confirm the failure",
      ],
    },
    {
      name: "planning",
      render: (tier) => buildPlanningMarkdown({ tier }),
      tokens: ["`todo`", "`in_progress`", "`completed`", "`cancelled`", "whole list"],
    },
    {
      name: "parallel tools",
      render: (tier) => buildParallelToolsMarkdown({ tier }),
      tokens: [
        "`bash`",
        "`run_async`",
        "`check_tasks`",
        "`await_task`",
        "`task_id`",
        "`notify`",
        "`notify_on_complete`",
        "~4 minutes",
        "`lost`",
      ],
    },
    {
      name: "subagents",
      render: (tier) => buildSubagentMarkdown({ workspaceNoun: "repo", roster, tier }),
      tokens: [
        "`agent`",
        "blank conversation",
        "non-overlapping write scopes",
        "`outputSchema`",
        "- **`task_fast`** — quick subtasks.",
      ],
    },
    {
      name: "media",
      render: (tier) => buildLookMarkdown({ ...oracle, tier }),
      tokens: ["`look`", "`read`", "Gemini 3 Flash", "self-contained question"],
    },
    {
      name: "hitl",
      render: (tier) => buildHitlMarkdown({ tier }),
      tokens: [
        "`ask_question`",
        "`options`",
        'style: "primary"',
        'style: "danger"',
        "allowFreeform: true",
        "one response",
      ],
    },
    {
      name: "communication",
      render: (tier) => buildCommunicationMarkdown({ tier }),
      tokens: ["Lead with the outcome", "Readable beats brief", "faithfully"],
    },
  ];

  for (const { name, render, tokens } of cases) {
    test(`${name}: both tiers carry the load-bearing tokens; compact is shorter`, () => {
      const full = render("full");
      const compact = render("compact");
      for (const token of tokens) {
        expect(full).toContain(token);
        expect(compact).toContain(token);
      }
      expect(compact.length).toBeLessThan(full.length * 0.75);
      // Same heading in both tiers — the structure is shared, only depth varies.
      const heading = full.split("\n")[0];
      expect(compact.split("\n")[0]).toBe(heading);
    });
  }
});

describe("instruction stack", () => {
  const root = join(dir, "stack-root");
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), "# Contents\n\n- repo stuff\n");

  test("composes the baseline in canonical order", () => {
    const sections = buildInstructionStackSections({
      workspaceRoot: root,
      workspaceNoun: "repo",
      verifyCommandHint: "bun run check",
      subagentRoster: [{ name: "task_fast", when: "quick subtasks" }],
      media: {
        modelName: "Gemini 3 Flash",
        capabilities: { image: true, pdf: true, video: true, audio: true },
      },
    });
    expect(sections.map((s) => s.id)).toEqual([...INSTRUCTION_STACK_SECTION_IDS]);
  });

  test("no oracle → no media section", () => {
    const sections = buildInstructionStackSections({ workspaceRoot: root });
    expect(sections.map((s) => s.id)).toEqual(
      INSTRUCTION_STACK_SECTION_IDS.filter((id) => id !== "media"),
    );
  });

  test("renders one markdown document with every heading in order", () => {
    const markdown = buildInstructionStackMarkdown({
      workspaceRoot: root,
      workspaceNoun: "repo",
    });
    const headings = [
      "## Repository conventions (root AGENTS.md)",
      "## How to work",
      "## Planning your work (todo)",
      "## Parallel tool calls",
      "## Delegating with the agent tool",
      "## Asking the user (ask_question)",
      "## Communicating",
    ];
    let last = -1;
    for (const heading of headings) {
      const at = markdown.indexOf(heading);
      expect(at).toBeGreaterThan(last);
      last = at;
    }
    expect(markdown).toContain("- repo stuff");
  });

  test("missing AGENTS.md drops the conventions section from the render", () => {
    const bare = join(dir, "stack-bare");
    mkdirSync(bare, { recursive: true });
    const markdown = buildInstructionStackMarkdown({ workspaceRoot: bare });
    expect(markdown).not.toContain("## Repository conventions");
    expect(markdown.startsWith("## How to work")).toBe(true);
  });

  test("omitSections drops baseline sections", () => {
    const sections = buildInstructionStackSections({
      workspaceRoot: root,
      omitSections: ["subagents", "hitl"],
    });
    const ids = sections.map((s) => s.id);
    expect(ids).not.toContain("subagents");
    expect(ids).not.toContain("hitl");
    expect(ids).toContain("workflow");
  });

  test("extraSections insert at their anchors, lazy form included", () => {
    const skills = {
      id: "skills",
      heading: "Available skills",
      body: "- verify-web — check the page",
    };
    const sections = buildInstructionStackSections({
      workspaceRoot: root,
      extraSections: () => [{ section: skills, placement: { after: "workflow" } }],
    });
    const ids = sections.map((s) => s.id);
    expect(ids.indexOf("skills")).toBe(ids.indexOf("workflow") + 1);
  });

  test("tier threads through to every section", () => {
    const full = buildInstructionStackMarkdown({ workspaceRoot: root });
    const compact = buildInstructionStackMarkdown({
      workspaceRoot: root,
      tier: "compact",
    });
    expect(compact.length).toBeLessThan(full.length);
    // Load-bearing tokens survive the compact tier at the stack level too.
    for (const token of ["`todo`", "`await_task`", "`ask_question`", "`agent`"]) {
      expect(compact).toContain(token);
    }
  });
});
