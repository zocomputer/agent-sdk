import { defineAgent, type AgentDefinition } from "eve";
import { defineDynamic, defineInstructions } from "eve/instructions";
import { createDirConventionsTracker } from "./dir-conventions";
import { createReadTool } from "./tools/read";
import { createWebFetchTool } from "./tools/webfetch";
import { createWorkspace } from "./workspace";

// The task subagent kit: a generic, full-capability child preset for eve's
// declared subagents (`agent/subagents/task_fast/`, `task_deep/`, …). Eve has
// no per-call model parameter — a subagent tool's input is fixed at
// `{ message, outputSchema? }` and its model is compiled from its `agent.ts` —
// so the model knob is encoded as ONE DECLARED SUBAGENT PER TIER: the caller
// picks a model by picking a tool, and each tool's description carries that
// model's identity and routing guidance.
//
// Unlike the retired read-only explore preset, a task child is a clone-alike:
// it re-exports the PARENT's tool surface (one-line re-exports — eve's
// isolation boundary means a declared subagent inherits nothing), minus an
// explicit exclusion list for parent-session-coupled tools, plus a
// `disableTool()` shim for `ask_question` (children are autonomous: they
// decide and report instead of parking the parent's turn on the user), with
// `read`/`webfetch` swapped for attach-disabled instances
// ({@link createTaskChildTools}) since no park-delivery hook runs in a child.
// `expectedTaskToolNames` is the manifest a consumer's test diffs its
// subagent `tools/` dir against, so a parent tool added without a re-export
// (or a forgotten shim) fails CI instead of silently shipping a child with a
// different tool surface than advertised.

/**
 * Framework built-ins a task child vacates with a `disableTool()` shim — one
 * `tools/<name>.ts` per entry. Only `ask_question`: a parked child parks the
 * PARENT's turn, so a task worker that hits ambiguity makes the reasonable
 * call itself (or reports the blocker as its result) instead of asking the
 * user. Everything else follows the parent: parent-authored tools re-export;
 * builtins the parent didn't touch stay at their framework defaults in the
 * child too.
 *
 * The `agent` clone tool is deliberately NOT here: eve injects it at the
 * harness layer, not as a framework tool, so a `disableTool()` shim for it
 * fails runtime agent-graph resolution — every session create 500s. The task
 * instruction bounds onward delegation instead.
 */
export const TASK_DISABLED_BUILTINS = ["ask_question"] as const;

/**
 * Options for `expectedTaskToolNames`: the parent's authored tool names and
 * the subset deliberately excluded from the child. A typo in the exclusion
 * list would silently weaken the manifest guard, so it throws on bad names.
 */
export interface TaskToolManifestOptions {
  /**
   * The parent's authored tool names — file names (without `.ts`) under the
   * parent's `agent/tools/`, disable shims included (re-exporting a parent
   * shim keeps the vacated name vacated in the child too).
   */
  parentToolNames: readonly string[];
  /**
   * Parent tools deliberately not re-exported into the child — the
   * parent-session/cockpit-coupled ones (e.g. a tool that queues messages
   * into the parent's own chat). Every entry must name a real parent tool;
   * a typo here would silently weaken the manifest guard, so it throws.
   */
  excludedParentTools?: readonly string[];
}

/**
 * The exact file set (sorted, without `.ts`) a task subagent's `tools/` dir
 * must contain: every parent tool minus the exclusions, plus one disable shim
 * per {@link TASK_DISABLED_BUILTINS} entry. A consumer's manifest test diffs
 * its directory against this so tool-surface drift fails CI.
 */
export function expectedTaskToolNames(options: TaskToolManifestOptions): string[] {
  const parent = new Set(options.parentToolNames);
  const excluded = options.excludedParentTools ?? [];
  for (const name of excluded) {
    if (!parent.has(name)) {
      throw new Error(
        `excludedParentTools names "${name}", which is not a parent tool — a stale exclusion would silently weaken the manifest guard`,
      );
    }
  }
  const names = new Set(options.parentToolNames.filter((name) => !excluded.includes(name)));
  for (const name of TASK_DISABLED_BUILTINS) {
    if (names.has(name)) {
      throw new Error(
        `"${name}" is both a parent tool and a task-disabled builtin — re-export or shim, not both`,
      );
    }
    names.add(name);
  }
  return [...names].sort();
}

/**
 * Options for `createTaskChildTools`: workspace root the child is confined to,
 * where oversized output spills, and whether to inject directory conventions
 * on first read.
 */
export interface TaskChildToolsOptions {
  /** Directory the child works in; tools refuse paths that escape it. */
  workspaceRoot: string;
  /** What tool descriptions call the workspace. Defaults to "workspace". */
  workspaceNoun?: string;
  /** Where oversized grep/webfetch output spills (the parent's spill dir). */
  spillDir: string;
  /**
   * Attach a directory's conventions file to the first `read` under it, once
   * per directory per session (see ./dir-conventions.ts). Defaults to `true`.
   */
  injectDirConventions?: boolean;
  /** Conventions filename the read riders look for. Defaults to "AGENTS.md". */
  conventionsFileName?: string;
}

/**
 * Child-safe `read` and `webfetch` overrides for a task subagent's `tools/`
 * dir. A declared child runs WITHOUT the park-delivery hook (it never parks
 * awaiting input — `ask_question` is shimmed off — so queued deliveries would
 * never send), which means the parent's attachment-enabled `read`/`webfetch`
 * would promise media "attached to your next message" that never arrives.
 * These instances disable attachments and rewrite the image hint to the
 * child's honest move: report the path so the caller can view it. Everything
 * else in the child's `tools/` stays a one-line re-export of the parent's
 * instance.
 */
export function createTaskChildTools(options: TaskChildToolsOptions) {
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
      // No client re-injects bytes in a child session; asking the user is
      // also off the table (ask_question is shimmed). Reporting is the
      // honest move. Bash-based hints stay default — the child has bash.
      imageUnavailableHint:
        "Its pixels are not available in a delegated child session — report the image's path and metadata in your final message so the caller can view it.",
      mediaUnavailableHint:
        "Its bytes are not available in a delegated child session — use bash extraction if text will do, or report the file's path and metadata so the caller can handle it.",
    }),
    webfetch: createWebFetchTool({
      workspace,
      spillDir: options.spillDir,
      attachImagesToChat: false,
      maxInlineImageBytes: 0,
      // Same honest move as read: children can't ask the user or deliver
      // attachments, so the honest guidance is to report the URL.
      imageUnavailableHint:
        "Its pixels are not available in a delegated child session — report the image's URL in your final message so the caller can fetch it.",
    }),
  };
}

/** Tool names {@link createTaskChildTools} overrides (not parent re-exports). */
export const TASK_CHILD_TOOL_OVERRIDES = ["read", "webfetch"] as const;

/** Pure markdown for the task child's operating contract. */
export function buildTaskMarkdown(opts?: { workspaceNoun?: string }): string {
  const noun = opts?.workspaceNoun ?? "workspace";
  return `## Working as a delegated task

You are a delegated worker: a copy of the parent agent, handed one self-contained task in this ${noun}. Your **final message is your entire deliverable** — the caller sees nothing else you did, so make it complete and self-contained.

- **Do the task asked, completely.** Cite concrete paths and line references (\`src/parser.ts:42\`) for every claim about code, so the caller can jump straight to it.
- **Decide, don't ask.** You cannot ask the user anything: make the reasonable call yourself and note it in your report. If you're genuinely blocked, report the blocker as your result — never guess silently.
- **Stay in your write scope.** Touch only the files your task calls for; the caller may be running sibling workers in parallel with their own scopes, and overlapping edits clobber.
- **Honor the requested thoroughness.** "quick" means the first solid result and stop; "very thorough" means check every plausible angle before concluding; "medium" sits between. Unspecified means medium.
- **Delegate onward sparingly.** You have your own \`agent\` clone for genuinely independent subtasks, but never chain delegations more than one level deeper.
- **Background tasks work, but \`notify\` doesn't.** You can \`run_async\` and \`await_task\`, but \`notify\` watchers queue matches that never deliver — you don't idle waiting for user input, so use \`await_task\` or \`check_tasks\` to poll instead.
- **Report outcomes, not process.** Skip the narration of your work; include what changed, what you verified, and only what changes what the caller does next.`;
}

/**
 * The task child's operating contract, wired as the subagent's
 * `instructions/task.ts` re-export. Static and session-stable
 * (prompt-cache safe).
 */
export function createTaskInstruction(opts?: { workspaceNoun?: string }) {
  const instruction = defineInstructions({ markdown: buildTaskMarkdown(opts) });
  return defineDynamic({
    events: {
      "session.started": () => instruction,
    },
  });
}

/**
 * Options for `buildTaskDescription`: the pinned model's display name and
 * catalog blurb, when to pick this tier over its siblings, capability notes
 * for excluded tools, and what the description calls the workspace.
 */
export interface TaskDescriptionOptions {
  /** Display name of the pinned model (e.g. "Claude Sonnet 5"). */
  modelName: string;
  /**
   * When the parent should pick this tier over its siblings, as one complete
   * sentence (e.g. "Prefer it for quick, well-scoped subtasks — exploration,
   * focused questions, mechanical edits — where a fast, cheap model is
   * enough.").
   */
  use: string;
  /**
   * The model's own catalog description (from the AI Gateway model catalog —
   * see {@link fetchGatewayModelCatalog}). Checked in by the consumer, never
   * fetched at agent build time: tool descriptions are part of the cached
   * prompt prefix and must be static and offline-safe.
   *
   * Explicitly `| undefined` (the exactOptionalPropertyTypes idiom): consumers
   * feed a `Record<string, string>` catalog lookup, which may miss — an
   * explicit `undefined` reads the same as omitting the blurb.
   */
  modelBlurb?: string | undefined;
  /**
   * What the child CANNOT do relative to the parent, as one complete
   * sentence — name the excluded tools when the consumer excludes any
   * (`excludedParentTools`), so the parent never delegates work the child
   * can't perform. Omit only when the child truly mirrors the parent's
   * authored toolset.
   */
  capabilityNote?: string;
  /** What the description calls the workspace. Defaults to "workspace". */
  workspaceNoun?: string;
}

/** Pure default for a task subagent's parent-facing tool description. */
export function buildTaskDescription(options: TaskDescriptionOptions): string {
  const noun = options.workspaceNoun ?? "workspace";
  const capability = options.capabilityNote ? ` ${options.capabilityNote}` : "";
  const blurb = options.modelBlurb
    ? ` About ${options.modelName}: ${options.modelBlurb}`
    : "";
  return `Delegate one self-contained subtask to a copy of this agent pinned to ${options.modelName} — same ${noun}, fresh conversation. It cannot ask the user anything: it decides and reports.${capability} ${options.use} Pack the message with everything the child needs (it sees none of your history), name the exact deliverable and the thoroughness you want ("quick", "medium", or "very thorough"), and give parallel children non-overlapping write scopes.${blurb}`;
}

/**
 * Options for `createTaskAgent`: extends `TaskDescriptionOptions` with the
 * child's pinned model, optional description override, and reasoning effort.
 */
export interface TaskAgentOptions extends TaskDescriptionOptions {
  /** The child's pinned model — the tier this subagent encodes. */
  model: AgentDefinition["model"];
  /**
   * Parent-facing tool description override (eve requires one on a declared
   * subagent). Defaults to {@link buildTaskDescription} over the other
   * options.
   */
  description?: string;
  /** Reasoning effort forwarded to the child's model calls. */
  reasoning?: AgentDefinition["reasoning"];
}

/**
 * The `defineAgent` config for a consumer's
 * `agent/subagents/task_<tier>/agent.ts`. The description is what the parent
 * model reads to pick a tier — it carries the model's identity, the
 * when-to-pick-it guidance, and the delegation contract, so the default is
 * written for the parent, not the child.
 */
export function createTaskAgent(options: TaskAgentOptions) {
  return defineAgent({
    description: options.description ?? buildTaskDescription(options),
    model: options.model,
    ...(options.reasoning !== undefined ? { reasoning: options.reasoning } : {}),
  });
}

// --- Gateway model catalog (for one-shot blurb-refresh scripts) --------------

/** One model entry from the AI Gateway's public model catalog. */
export interface GatewayModelInfo {
  id: string;
  name: string | undefined;
  description: string | undefined;
}

/** The AI Gateway's public model-catalog endpoint (no API key required). */
export const GATEWAY_MODELS_URL = "https://ai-gateway.vercel.sh/v1/models";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parse the gateway catalog response body
 * (`{ data: [{ id, name?, description? }, …] }`) into typed entries; `null`
 * on any malformed shape. Same catalog the AI SDK's
 * `gateway.getAvailableModels()` reads.
 */
export function parseGatewayModelCatalog(value: unknown): GatewayModelInfo[] | null {
  if (!isRecord(value) || !Array.isArray(value.data)) return null;
  const models: GatewayModelInfo[] = [];
  for (const entry of value.data) {
    if (!isRecord(entry) || typeof entry.id !== "string") return null;
    models.push({
      id: entry.id,
      name: typeof entry.name === "string" ? entry.name : undefined,
      description: typeof entry.description === "string" ? entry.description : undefined,
    });
  }
  return models;
}

/**
 * Fetch the AI Gateway model catalog — names + descriptions for every model
 * the gateway serves. For ONE-SHOT refresh scripts that regenerate a
 * consumer's checked-in model blurbs; never call it at agent build time (tool
 * descriptions are part of the cached prompt prefix, so they must be static
 * and offline-safe).
 */
export async function fetchGatewayModelCatalog(options?: {
  url?: string;
  /** Injectable fetch seam (the one call this makes); defaults to global fetch. */
  fetchImpl?: (url: string) => Promise<Response>;
}): Promise<GatewayModelInfo[]> {
  const url = options?.url ?? GATEWAY_MODELS_URL;
  const fetchImpl = options?.fetchImpl ?? fetch;
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`gateway model catalog fetch failed: ${response.status} ${url}`);
  }
  const parsed = parseGatewayModelCatalog(await response.json());
  if (parsed === null) {
    throw new Error(`gateway model catalog response has an unexpected shape: ${url}`);
  }
  return parsed;
}
