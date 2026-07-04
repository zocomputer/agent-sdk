import { defineAgent, type AgentDefinition } from "eve";
import { defineDynamic, defineInstructions } from "eve/instructions";
import { createDirConventionsTracker } from "./dir-conventions";
import { createGlobTool } from "./tools/glob";
import { createGrepTool } from "./tools/grep";
import { createReadTool } from "./tools/read";
import { createWorkspace } from "./workspace";

// The explore subagent kit: a read-only child preset for eve's declared
// subagents (`agent/subagents/explore/`). A read-only child is the safest
// delegation to fan out — no write scopes to coordinate — and exploration is
// where a faster, cheaper model costs least: the deliverable is a report with
// paths and line refs, not an edit.
//
// The correctness core is eve's isolation boundary: a declared subagent
// inherits NOTHING from the root — an absent tools/ slot falls back to the
// FRAMEWORK defaults (bash, write_file, …), i.e. full write capability.
// "Read-only" therefore has to be constructed: author the read tools AND ship
// a disableTool() shim for every writing built-in. EXPLORE_DISABLED_BUILTINS
// is the manifest a consumer's test diffs its tools/ dir against, so a
// forgotten shim (= silently resurrected write capability) fails CI instead
// of shipping. See the README's "Declare an explore subagent".

/** The read-only toolset's wire names — one `tools/<name>.ts` re-export each. */
export const EXPLORE_TOOL_NAMES = ["read", "glob", "grep"] as const;

/**
 * Framework built-ins a read-only explore child must vacate with a
 * `disableTool()` shim — one `tools/<name>.ts` per entry. `bash` and
 * `write_file` write; `read_file` is vacated in favor of `read`; `web_fetch`/
 * `web_search` keep the blast radius at zero (exploration is repo-local);
 * `ask_question` would park the parent's turn — an explorer that hits
 * ambiguity reports it as its answer instead; `todo`/`load_skill` are
 * one-question-child noise (no multi-step plans, no skills dir) and keep the
 * instruction's "your tools are `read`, `glob`, and `grep`" literally true.
 *
 * The `agent` clone tool is deliberately NOT here: eve injects it at the
 * harness layer (`createNodeHarnessTools`), not as a framework tool, so a
 * `disableTool()` shim for it fails runtime agent-graph resolution — every
 * session create 500s with `"agent" is not a framework tool`. Until eve
 * offers a disable path for the clone, recursion is discouraged by the
 * explore instruction instead (see the README's eve-maintainers notes).
 */
export const EXPLORE_DISABLED_BUILTINS = [
  "ask_question",
  "bash",
  "load_skill",
  "read_file",
  "todo",
  "web_fetch",
  "web_search",
  "write_file",
] as const;

export interface ExploreToolsOptions {
  /** Directory the explorer reads; tools refuse paths that escape it. */
  workspaceRoot: string;
  /** What tool descriptions call the workspace. Defaults to "workspace". */
  workspaceNoun?: string;
  /**
   * Attach a directory's conventions file to the first `read` under it, once
   * per directory per session (see ./dir-conventions.ts). Defaults to `true`.
   */
  injectDirConventions?: boolean;
  /** Conventions filename the read riders look for. Defaults to "AGENTS.md". */
  conventionsFileName?: string;
}

/**
 * The read-only explore toolset: `read`, `glob`, `grep` — no edit/write/bash,
 * no task machinery. Images read as metadata only (`attachImagesToChat:
 * false`): the child runs without a park-delivery hook, so there is no client
 * to re-inject the bytes.
 */
export function createExploreTools(options: ExploreToolsOptions) {
  const noun = options.workspaceNoun ?? "workspace";
  const workspace = createWorkspace(options.workspaceRoot);
  const conventionsFileName = options.conventionsFileName ?? "AGENTS.md";
  const dirConventions =
    (options.injectDirConventions ?? true)
      ? {
          tracker: createDirConventionsTracker({
            workspaceRoot: workspace.root,
            fileName: conventionsFileName,
          }),
          fileName: conventionsFileName,
        }
      : undefined;
  return {
    read: createReadTool({
      workspace,
      noun,
      attachImagesToChat: false,
      maxInlineImageBytes: 0,
      dirConventions,
      // The default hints suggest bash, editing, and ask_question — all absent
      // here. A file over read's cap is genuinely out of this preset's reach
      // (the size check throws before windowing, and grep skips oversized
      // files too), so the honest move is the explorer's contract: report it.
      oversizeHint:
        "This file is beyond your tools' reach — report its path and size so the caller can extract what's needed.",
      imageUnavailableHint:
        "Its pixels are not available to you — report the image's path and metadata so the caller can view it.",
      includeEditGuidance: false,
    }),
    glob: createGlobTool({ workspace, noun }),
    grep: createGrepTool({ workspace, noun }),
  };
}

/** Pure markdown for the explore child's operating contract. */
export function buildExploreMarkdown(opts?: { workspaceNoun?: string }): string {
  const noun = opts?.workspaceNoun ?? "workspace";
  return `## Exploring (read-only)

You are a read-only explorer: you answer one focused question about this ${noun} and report back. You cannot edit files, run commands, or ask the user anything — your tools are \`read\`, \`glob\`, and \`grep\`, and your **final message is your entire deliverable**: the caller sees nothing else you did, so make it complete and self-contained. Answer the question yourself; never delegate it onward to another agent.

- **Answer the question asked.** Cite concrete paths and line references (\`src/parser.ts:42\`) for every claim so the caller can jump straight to the code.
- **Honor the requested thoroughness.** "quick" means find the first solid answer and stop; "very thorough" means check every plausible location and naming convention before concluding; "medium" sits between. Unspecified means medium.
- **Never guess silently.** If the ${noun} doesn't answer the question, say so plainly and report what you did find and where you looked.
- **Report findings, not process.** Skip the narration of your search; include only what changes what the caller does next.`;
}

/**
 * The explore child's operating contract, wired as the subagent's
 * `instructions.ts` re-export. Static and session-stable (prompt-cache safe).
 */
export function createExploreInstruction(opts?: { workspaceNoun?: string }) {
  const instruction = defineInstructions({ markdown: buildExploreMarkdown(opts) });
  return defineDynamic({
    events: {
      "session.started": () => instruction,
    },
  });
}

/** Pure default for the explore subagent's parent-facing tool description. */
export function buildExploreDescription(workspaceNoun = "workspace"): string {
  return `Fast read-only ${workspaceNoun} exploration: delegate one focused how/where/what question and get back a report with concrete paths and line references. It cannot edit files or run commands, so several can safely run in parallel. Pack the message with everything it needs (it sees none of your history) and state the thoroughness you want: "quick", "medium", or "very thorough".`;
}

export interface ExploreAgentOptions {
  /** The child's model — pick a fast, cheap slug; exploration rarely needs the parent's model. */
  model: AgentDefinition["model"];
  /**
   * Parent-facing tool description (eve requires one on a declared subagent).
   * Defaults to {@link buildExploreDescription}.
   */
  description?: string;
  /** What the description calls the workspace. Defaults to "workspace". */
  workspaceNoun?: string;
  /** Reasoning effort forwarded to the child's model calls. */
  reasoning?: AgentDefinition["reasoning"];
}

/**
 * The `defineAgent` config for a consumer's
 * `agent/subagents/explore/agent.ts`. The description is what the parent
 * model reads to decide when to delegate — it carries the routing guidance
 * (read-only, parallel-safe, thoroughness), so the default is written for the
 * parent, not the child.
 */
export function createExploreAgent(options: ExploreAgentOptions) {
  return defineAgent({
    description:
      options.description ?? buildExploreDescription(options.workspaceNoun),
    model: options.model,
    ...(options.reasoning !== undefined ? { reasoning: options.reasoning } : {}),
  });
}
