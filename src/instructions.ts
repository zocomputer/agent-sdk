import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineDynamic, defineInstructions } from "eve/instructions";
import {
  describeCapabilities,
  type ModelInputCapabilities,
} from "./model-capabilities";
import {
  composePromptSections,
  renderPromptSection,
  renderPromptSections,
  type InstructionTier,
  type PlacedPromptSection,
  type PromptSection,
} from "./prompt-sections";

// The SDK's baseline system prompt, authored as sections (see
// prompt-sections.ts). Every section comes in two tiers — "full" (each rule
// with its rationale) and "compact" (the same load-bearing rules and tool
// names, roughly a third the prose) — authored side by side in one builder so
// they can't drift the way forked prompt files do (codex hand-maintains a
// separate ~3× smaller prompt per model family; we generate both from one
// source — journal/team/harness-research/2026-07-08-learning-from-codex.md §5).
//
// Two consumption modes:
// - The composed stack (`createInstructionStackInstruction`): one dynamic
//   instruction carrying every section in the SDK's canonical order, with
//   omit/extras seams for consumer edits. Preferred — eve orders instruction
//   slots alphabetically by filename, so per-file wiring surrenders section
//   order to filenames.
// - À la carte factories (`create*Instruction`): one file per section, for
//   agents that want a subset (e.g. task subagents that drop delegation and
//   communication sections).
//
// All of it is prompt-cache safe: dynamic instructions build on
// "session.started" only, so the prompt prefix is byte-stable for a session's
// lifetime and edits take effect on the next chat, never mid-session.

// ---------------------------------------------------------------------------
// Repository conventions
// ---------------------------------------------------------------------------

// eve ingests no AGENTS.md at runtime, so an eve agent working in a real repo
// needs the root conventions injected (every other harness — Cursor, Claude
// Code — reads them natively). Tier-invariant: the body is the repo's own
// text, not SDK prose to resize.

/**
 * The root-AGENTS.md section: the workspace's root conventions file wrapped
 * in a `<root-agents-md>` block. Empty body (renders nothing) when the file
 * is absent. Tier-invariant — the content is the repo's, not the SDK's.
 */
export function repoConventionsSection(opts: { workspaceRoot: string }): PromptSection {
  let agents = "";
  try {
    agents = readFileSync(resolve(opts.workspaceRoot, "AGENTS.md"), "utf8").trim();
  } catch {
    // No root AGENTS.md (e.g. the agent pointed at a non-repo dir) — inject nothing.
  }
  return {
    id: "repo-conventions",
    heading: "Repository conventions (root AGENTS.md)",
    body: agents
      ? `These repo-wide conventions always apply. Nested directories add their own \`AGENTS.md\` — read those for the code you touch.

<root-agents-md>
${agents}
</root-agents-md>`
      : "",
  };
}

/** Pure markdown for the root-AGENTS.md section; "" when the file is absent. */
export function buildRepoConventionsMarkdown(workspaceRoot: string): string {
  return renderPromptSection(repoConventionsSection({ workspaceRoot }));
}

/**
 * Inject the workspace's root AGENTS.md as a system-prompt section. Nested
 * per-directory AGENTS.md files stay the model's job to read — this covers
 * the root conventions.
 */
export function createRepoConventionsInstruction(opts: { workspaceRoot: string }) {
  const { workspaceRoot } = opts;
  return defineDynamic({
    events: {
      "session.started": () =>
        defineInstructions({ markdown: buildRepoConventionsMarkdown(workspaceRoot) }),
    },
  });
}

// ---------------------------------------------------------------------------
// Workflow
// ---------------------------------------------------------------------------

/**
 * The how-to-work section: explore→read→edit, follow conventions, reproduce a
 * bug before fixing it, verify, track with `todo`, and the end-of-turn
 * completeness check. The compact tier keeps every rule and tool name as a
 * terse bullet.
 */
export function workflowSection(opts?: {
  /** What the prose calls the workspace ("repo", "project"…). */
  workspaceNoun?: string | undefined;
  /** Verify command to name in the verification rule (e.g. "bun run check"). */
  verifyCommandHint?: string | undefined;
  /** Prose depth; defaults to "full". */
  tier?: InstructionTier | undefined;
}): PromptSection {
  const noun = opts?.workspaceNoun ?? "workspace";
  const verify = opts?.verifyCommandHint
    ? ` (e.g. \`${opts.verifyCommandHint}\`)`
    : "";
  const body =
    (opts?.tier ?? "full") === "compact"
      ? `- Explore with \`glob\`/\`grep\` and \`read\` before editing; match the ${noun}'s existing patterns.
- Read a file before editing it. \`edit\` for targeted changes; \`write\` for new files or full rewrites.
- Fixing a bug? Write a minimal reproduction (a failing test or script), run it to confirm the failure, fix, then re-run it to confirm the failure is gone.
- After changing code, run the relevant checks${verify} and fix what you broke.
- Track multi-step work with \`todo\`.
- Don't end your turn on promised work ("I'll…"), next steps you could take now, or a question a tool call could answer — do the work, or report what blocks it.`
      : `1. **Explore before you edit.** Find the relevant code with \`glob\`/\`grep\` and \`read\` it — match the ${noun}'s existing patterns instead of guessing.
2. **Read a file before editing it**, so your edits target the current text. Prefer \`edit\` for targeted changes; use \`write\` for new files or full rewrites.
3. **Follow the surrounding conventions.** Match the style, structure, and idioms of the code around your change rather than imposing your own.
4. **Reproduce a bug before you fix it.** When the task is a bug fix, write a minimal reproduction — a failing test, or a small script — and run it to confirm the failure before changing code. After the fix, re-run the reproduction to prove the failure is gone; prefer a test-shaped repro that stays in the suite so the bug stays fixed. A fix you never watched fail is a guess.
5. **Verify your work.** After changing code, run the relevant checks${verify} and fix what you broke. Leave the ${noun} in a working state.
6. **Track multi-step work** with \`todo\`, and keep it current as you finish each step.
7. **Finish the job before ending your turn.** Reread your final message: if it promises work ("I'll…"), lays out next steps you could take now, or asks a question you could answer yourself with a tool call, do that work instead of stopping. End your turn only when the task is complete or you're blocked on something only the user can provide.`;
  return { id: "workflow", heading: "How to work", body };
}

/** Pure markdown for the how-to-work contract; see createWorkflowInstruction. */
export function buildWorkflowMarkdown(opts?: {
  workspaceNoun?: string;
  verifyCommandHint?: string | undefined;
  tier?: InstructionTier | undefined;
}): string {
  return renderPromptSection(workflowSection(opts));
}

/**
 * The how-to-work contract: explore→read→edit→verify, reproduction-first bug
 * fixing, todo tracking, and the end-of-turn completeness check. Static
 * markdown, session-stable (prompt-cache safe); the verify hint interpolates
 * once at build time.
 */
export function createWorkflowInstruction(opts?: {
  workspaceNoun?: string;
  verifyCommandHint?: string | undefined;
  tier?: InstructionTier | undefined;
}) {
  const instruction = defineInstructions({ markdown: buildWorkflowMarkdown(opts) });
  return defineDynamic({
    events: {
      "session.started": () => instruction,
    },
  });
}

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------

/**
 * The todo-tool playbook: when a plan is worth writing, what a good step
 * looks like, and the status discipline (one `in_progress`, immediate
 * completion, whole-list writes, cancel-don't-abandon). eve ships the `todo`
 * tool with no guidance — same gap as ask_question — and models under-plan or
 * let lists go stale without it. Adapted from codex's Planning section.
 */
export function planningSection(opts?: {
  /** Prose depth; defaults to "full". */
  tier?: InstructionTier | undefined;
}): PromptSection {
  const body =
    (opts?.tier ?? "full") === "compact"
      ? `- Track any multi-step task with \`todo\`; skip the list for a single obvious action.
- Steps are specific and verifiable — no filler items ("investigate", "final polish").
- Keep exactly one item \`in_progress\`; mark items \`completed\` the moment they're done, not batched at the end.
- Each \`todo\` write replaces the whole list — always send every item.
- Rewrite the plan when scope changes; mark obsolete items \`cancelled\`.
- End your turn with every item \`completed\` or \`cancelled\`.`
      : `Use the \`todo\` tool as your live plan for any multi-step task — the user watches it to follow your progress.

- **Plan real tasks, skip trivia.** A task with several distinct steps (or real ambiguity about the approach) gets a todo list up front; a single obvious action doesn't need one.
- **Make steps specific and verifiable.** Each item names concrete work with a clear done-state, not a vague direction. No filler steps ("investigate", "final polish"), and don't pad a two-step task into five.
- **Keep exactly one item \`in_progress\`.** Mark it before you start that work, and mark it \`completed\` the moment it's done — don't batch completions at the end.
- **Each write replaces the whole list**, so always send every item, not a delta.
- **Rewrite the plan when the task changes.** New discoveries or a scope pivot mean updating the list to match reality — mark items that no longer apply \`cancelled\` rather than leaving them pending.
- **Don't restate the list in prose.** The user sees the todo list itself; your messages should carry what it can't.
- **End your turn with every item \`completed\` or \`cancelled\`.** An item still \`pending\` or \`in_progress\` means the work isn't done — finish it or say what blocks it.`;
  return { id: "planning", heading: "Planning your work (todo)", body };
}

/** Pure markdown for the todo-planning playbook; see createPlanningInstruction. */
export function buildPlanningMarkdown(opts?: {
  tier?: InstructionTier | undefined;
}): string {
  return renderPromptSection(planningSection(opts));
}

/**
 * The planning playbook for eve's built-in `todo` tool: when to plan, step
 * quality, and status discipline. Static and session-stable (prompt-cache
 * safe).
 */
export function createPlanningInstruction(opts?: {
  tier?: InstructionTier | undefined;
}) {
  const instruction = defineInstructions({ markdown: buildPlanningMarkdown(opts) });
  return defineDynamic({
    events: {
      "session.started": () => instruction,
    },
  });
}

// ---------------------------------------------------------------------------
// Parallel tool calls
// ---------------------------------------------------------------------------

/**
 * The background-work section for the stdlib's async tools (bash
 * auto-backgrounding, run_async/check_tasks/await_task, and the
 * prompt-cache-aware polling rule). Static by design: live task state belongs
 * in tool results (check_tasks), never re-rendered into the prompt. See
 * journal/team/harness-research/2026-07-01-prompt-cache-as-economic-constraint.md.
 */
export function parallelToolsSection(opts?: {
  /** Prose depth; defaults to "full". */
  tier?: InstructionTier | undefined;
}): PromptSection {
  const body =
    (opts?.tier ?? "full") === "compact"
      ? [
          `Long-running work continues in the **background**: \`bash\` auto-returns a \`task_id\` when a command outlives its short foreground wait; \`run_async\` starts there directly.`,
          ``,
          `- Next action independent of the result? Keep working, then \`check_tasks\` (non-blocking status) or \`await_task\` (blocks for the result). Dependent? \`await_task\` right away.`,
          `- Several tasks can run at once — track their \`task_id\`s.`,
          `- When you do poll on wall-clock time, keep each blocking call under ~4 minutes — one long silent call lets the provider prompt cache expire and re-prices your whole context.`,
          `- Completed results survive restarts; a task running through a restart reports \`lost\` — start it again if it still matters.`,
          `- Before ending your turn, await every task whose result matters (\`check_tasks\` if unsure what's in flight).`,
        ].join("\n")
      : [
          `Long-running work can continue in the **background** instead of blocking the turn. The \`bash\` tool does this automatically: if a command is still running after its short foreground wait, it returns a \`task_id\` and keeps the process alive. You can also use \`run_async\` when you already know the work should start in the background. After you start background work, decide whether your *next* action depends on its output:`,
          ``,
          `- **Independent?** Keep working — read files, make edits, start other tasks — then \`check_tasks\` (non-blocking status + live output preview) or \`await_task\` (blocks for the result) when it's convenient.`,
          `- **Dependent?** Call \`await_task\` right away; treat it like a normal blocking call.`,
          ``,
          `Guidance:`,
          `- Prefer plain \`bash\` for shell commands even when they might run long; it auto-returns a task handle if needed. Use \`run_async\` when you already know a command should start in the background and want to skip the foreground wait.`,
          `- You can have several tasks in flight at once. Each \`run_async\` returns a \`task_id\`; keep track of them.`,
          `- \`check_tasks\` shows status and live output previews for tasks that support progress. \`await_task\` returns the final output.`,
          `- When you do poll on wall-clock time (waiting on CI, a review, a deploy), keep any single blocking call under ~4 minutes — one sleep+check per call, not a whole retry loop in one call. Provider prompt caches expire after ~5 minutes of model inactivity, so one long silent call re-prices your entire context on the next step; returning between polls keeps it warm.`,
          `- Background task metadata and completed results persist across agent restarts. A task still running during a restart is reported as \`lost\`; start it again if its result still matters.`,
          `- Before finishing your turn, make sure any background task whose result matters has been awaited — don't end while relevant work is still running. If you're unsure what's still in flight, call \`check_tasks\`.`,
        ].join("\n");
  return { id: "parallel-tools", heading: "Parallel tool calls", body };
}

/** Pure markdown for the background-work playbook; see createParallelToolsInstruction. */
export function buildParallelToolsMarkdown(opts?: {
  tier?: InstructionTier | undefined;
}): string {
  return renderPromptSection(parallelToolsSection(opts));
}

/**
 * The workflow guidance for the stdlib's async tools (bash auto-backgrounding,
 * run_async/check_tasks/await_task). Static by design: dynamic instructions
 * are system messages — part of the cached prompt prefix — so live task state
 * belongs in tool results (check_tasks), never re-rendered here.
 */
export function createParallelToolsInstruction(opts?: {
  tier?: InstructionTier | undefined;
}) {
  const instruction = defineInstructions({
    markdown: buildParallelToolsMarkdown(opts),
  });
  return defineDynamic({
    events: {
      "session.started": () => instruction,
    },
  });
}

// ---------------------------------------------------------------------------
// Communication
// ---------------------------------------------------------------------------

/**
 * The reporting-contract section: lead with the outcome, write tightly and
 * concretely, take a position, structure deliberately, report-don't-fix when
 * the user is diagnosing, act without permission-seeking inside scope, and
 * report outcomes faithfully.
 */
export function communicationSection(opts?: {
  /** Prose depth; defaults to "full". */
  tier?: InstructionTier | undefined;
}): PromptSection {
  const body =
    (opts?.tier ?? "full") === "compact"
      ? `- Lead with the outcome: the first sentence says what changed, what you found, whether it worked.
- Write tight: match length to the ask; keep details that change understanding or the next move; cut preambles, filler, signposting, repeated summaries, and closing offers. Name the specific file, function, or command. Complete thoughts matter; fragments are fine when clearer.
- Take a position when asked to compare or recommend: give the conclusion and its reason, without a survey of rejected options or an empty trade-off ending.
- Use structure deliberately: bullets for parallel items, paragraphs for connected reasoning, headings only when they help a longer answer scan.
- When the user is diagnosing, investigate and report; apply a fix only when asked.
- Act within scope without asking permission; stop only for destructive or hard-to-reverse actions, or genuine scope changes.
- Report faithfully and precisely: quantify when possible, name limits and skipped steps, state real uncertainty once, and include the output for a failed check.`
      : `- **Lead with the outcome.** The first sentence of your final message answers "what happened" — what changed, what you found, whether it worked. Supporting detail and reasoning come after, for readers who want them.
- **Write tight.** Match the response's length to the ask. Keep details that change the reader's understanding or next move; cut preambles, filler, signposting, repeated summaries, and closing offers to do more. End when the content ends. Write complete thoughts and name the specific thing — the actual file, function, command, count, or date. Sentence fragments are fine when they read more clearly than a full sentence; fragment chains, arrow chains, and bare jargon are not.
- **Take a position.** When asked to compare or recommend, give the conclusion and its reason. Skip the survey of options you rejected and the empty "there are trade-offs on both sides" ending.
- **Use structure deliberately.** Bullets suit parallel, independent items; connected reasoning belongs in paragraphs. Add headings only when they make a longer answer easier to scan, and don't add a recap that repeats what the reader just read.
- **Report, don't fix, when the user is diagnosing.** If they're describing a problem or asking a question, the deliverable is your assessment: investigate and report. Apply a fix only when they ask for one.
- **Act within scope without asking.** For reversible actions that follow from the task, decide and proceed — asking "Should I…?" stalls the work. Stop to ask only for destructive or hard-to-reverse actions, or genuine scope changes the user must decide.
- **Report outcomes faithfully and precisely.** Quantify claims when possible, name real limits, and state uncertainty once. If a check fails, say so and include the output; if you skipped a step, say that; when something is done and verified, state it plainly without hedging.`;
  return { id: "communication", heading: "Communicating", body };
}

/** Pure markdown for the reporting contract; see createCommunicationInstruction. */
export function buildCommunicationMarkdown(opts?: {
  tier?: InstructionTier | undefined;
}): string {
  return renderPromptSection(communicationSection(opts));
}

/**
 * The reporting contract: lead with the outcome, write tightly and
 * concretely, take a position, structure deliberately, assess-don't-fix when
 * the user is diagnosing, and act without permission-seeking inside the task's
 * scope. Static and session-stable (prompt-cache safe).
 */
export function createCommunicationInstruction(opts?: {
  tier?: InstructionTier | undefined;
}) {
  const instruction = defineInstructions({
    markdown: buildCommunicationMarkdown(opts),
  });
  return defineDynamic({
    events: {
      "session.started": () => instruction,
    },
  });
}

// ---------------------------------------------------------------------------
// Asking the user (HITL)
// ---------------------------------------------------------------------------

/**
 * The ask_question playbook section: ask only when blocked on the user's
 * choice, structured options with a primary recommendation, freeform open,
 * batch independent questions.
 */
export function hitlSection(opts?: {
  /** Prose depth; defaults to "full". */
  tier?: InstructionTier | undefined;
}): PromptSection {
  const body =
    (opts?.tier ?? "full") === "compact"
      ? `Call \`ask_question\` only when you're blocked on a choice that is the user's to make — never for permission to proceed with a reasonable default.

- Enumerable choices → \`options\` (each \`{ id, label, description?, style? }\`); put your recommendation first with \`style: "primary"\`, use \`style: "danger"\` for destructive choices.
- Keep \`allowFreeform: true\` unless the answer must be exactly one of the options.
- Ask independent questions as several \`ask_question\` calls in one response — they collect into a single prompt with all answers at once.`
      : `Call \`ask_question\` only when you're genuinely blocked on a choice that is the user's to make — not for permission to proceed with a reasonable default you can pick yourself. When you do ask:

- **Offer \`options\` when the choices are enumerable** instead of asking open-ended; each option is \`{ id, label, description?, style? }\` and the user answers with one click.
- **Put your recommended option first** and mark it \`style: "primary"\`. Use \`style: "danger"\` for destructive or hard-to-reverse choices.
- **Use each option's \`description\`** for the trade-off the label can't carry.
- **Keep free text open** (\`allowFreeform: true\`) unless the answer must be exactly one of the options.
- **Ask independent questions together**: emit several \`ask_question\` calls in one response — they collect into a single prompt and you get all the answers at once, instead of making the user answer serial round-trips.`;
  return { id: "hitl", heading: "Asking the user (ask_question)", body };
}

/** Pure markdown for the ask_question playbook; see createHitlInstruction. */
export function buildHitlMarkdown(opts?: {
  tier?: InstructionTier | undefined;
}): string {
  return renderPromptSection(hitlSection(opts));
}

/**
 * The ask_question playbook for eve's built-in HITL tool. The framework ships
 * the tool with a one-line description and no guidance on options, styles, or
 * when to ask; models under-use the structured surface without this. Static
 * and session-stable (prompt-cache safe).
 */
export function createHitlInstruction(opts?: {
  tier?: InstructionTier | undefined;
}) {
  const instruction = defineInstructions({ markdown: buildHitlMarkdown(opts) });
  return defineDynamic({
    events: {
      "session.started": () => instruction,
    },
  });
}

// ---------------------------------------------------------------------------
// Media delegation (look)
// ---------------------------------------------------------------------------

/**
 * The media-delegation section for agents with a `look` oracle wired: view
 * natively what the session model supports, route documents through `read`,
 * delegate the rest to the oracle with a self-contained question.
 */
export function lookSection(opts: {
  /** The oracle model's display name (e.g. "Gemini 3 Flash"). */
  modelName: string;
  /** The oracle model's input capabilities. */
  capabilities: ModelInputCapabilities;
  /**
   * The session model's own input capabilities, when the consumer resolved
   * them — adds the "view what you can natively" half of the routing rule.
   */
  parentCapabilities?: ModelInputCapabilities | undefined;
  /** Prose depth; defaults to "full". */
  tier?: InstructionTier | undefined;
}): PromptSection {
  const oraclePhrase = describeCapabilities(opts.capabilities);
  // `read`'s delivery varies per instance (attachments can be disabled — task
  // children, capability-derived defaults) and per kind (documents convert to
  // text; video/audio attach only behind opt-in flags), so the playbook
  // defers to read's own result notes instead of promising delivery here.
  const parentSentence = opts.parentCapabilities
    ? ` Your own model ${describeCapabilities(opts.parentCapabilities)}.`
    : "";
  const body =
    (opts.tier ?? "full") === "compact"
      ? `The \`look\` tool delegates one question about a media file you can't view to ${opts.modelName} — a model that ${oraclePhrase} — and returns its answer as text.${parentSentence}

- Documents (PDF, DOCX, spreadsheets) convert to text through \`read\` — no delegation needed.
- Prefer \`read\` for media it can deliver; when it returns metadata only, its note names the right move.
- \`look\` at kinds outside your own input support: pass the path and a self-contained question.
- Ask for the deliverable (transcribe, describe, summarize), not a viewing — the model sees only the file and your prompt.`
      : `Some files carry content your model can't take as input.${parentSentence} The \`look\` tool delegates one question about a media file to ${opts.modelName} — a model that ${oraclePhrase} — sending the file's bytes and your prompt in a single call and returning the answer as text.

- **Documents come back as text.** PDFs, DOCX, and spreadsheets convert through \`read\` — no delegation needed for their text.
- **Prefer \`read\` for media it can deliver.** When \`read\` can put a media file in front of you it says so in its result; when it returns metadata only, its note names the right move.
- **\`look\` at what you can't view.** For kinds outside your own input support (or when a read note points there), pass the path and a self-contained question to \`look\` instead of reporting a dead end.
- **Ask for the deliverable, not a viewing.** The model sees only the file and your prompt — request the specific extraction you need (transcribe the visible text, describe the layout, summarize the recording) so one answer suffices.`;
  return { id: "media", heading: "Media you can't view (look)", body };
}

/** Pure markdown for the media-delegation playbook; see createLookInstruction. */
export function buildLookMarkdown(opts: {
  modelName: string;
  capabilities: ModelInputCapabilities;
  parentCapabilities?: ModelInputCapabilities | undefined;
  tier?: InstructionTier | undefined;
}): string {
  return renderPromptSection(lookSection(opts));
}

/**
 * The media-delegation playbook for agents with a `look` oracle wired: view
 * natively what the session model supports, delegate the rest to the oracle.
 * Static markdown, session-stable (prompt-cache safe), parameterized once at
 * build time.
 */
export function createLookInstruction(opts: {
  modelName: string;
  capabilities: ModelInputCapabilities;
  parentCapabilities?: ModelInputCapabilities | undefined;
  tier?: InstructionTier | undefined;
}) {
  const instruction = defineInstructions({ markdown: buildLookMarkdown(opts) });
  return defineDynamic({
    events: {
      "session.started": () => instruction,
    },
  });
}

// ---------------------------------------------------------------------------
// Sandbox artifact workflows
// ---------------------------------------------------------------------------

/**
 * Routing guidance for consumers whose sandbox image carries Zo's standard
 * document, browser, media, and data CLIs. Kept opt-in because the SDK can
 * also run over arbitrary sandboxes that do not provide this image contract.
 */
export function sandboxArtifactsSection(opts?: {
  /** Prose depth; defaults to "full". */
  tier?: InstructionTier | undefined;
}): PromptSection {
  const body =
    (opts?.tier ?? "full") === "compact"
      ? `Use tools for understanding; use sandbox CLIs for durable artifacts and deterministic transforms.

- \`webfetch\` brings one URL into context. Persist clean static content with \`defuddle parse <url-or-html> --markdown -o <file>\`; use \`agent-browser\` for interaction, authentication, or client-rendered pages (run \`agent-browser skills get core\` for its version-matched workflow).
- \`read\` extracts document/data text; \`look\` inspects layout, pixels, audio, or video. Use Pandoc/LibreOffice/Typst and the PDF/OCR tools to create or convert documents; DuckDB/SQLite/jq/yq for data transforms.
- Use the cloud media tools for generation; use ffmpeg/libvips/ImageMagick/ExifTool/yt-dlp for deterministic media work. For a model without video input, preserve audio/transcript and timestamps, then combine shot-aware \`scenedetect\` frames with a sparse uniform sample; inspect rapid or important intervals more densely.`
      : `Choose between an in-context tool result and a durable sandbox artifact deliberately:

- **Web content:** use \`webfetch\` when you need one URL's content in the conversation. It performs one read-only request and extracts the main content; it is not a browser session or a clipping workflow. To save clean Markdown without routing the full article through context, run \`defuddle parse <url-or-html> --markdown -o <file>\`. Use \`agent-browser\` when the page needs JavaScript, interaction, or authentication; run \`agent-browser skills get core\` for instructions matching the installed CLI. A rendered page can then be saved as HTML and passed to Defuddle.
- **Documents and data:** use \`read\` for extracted text and \`look\` when layout or pixels matter. Use Pandoc, LibreOffice, Typst, and the PDF/OCR tools through \`bash\` when the deliverable is a created or converted file. Use DuckDB, SQLite, jq, or yq for repeatable queries and transforms instead of pasting large datasets into context.
- **Media:** use \`look\` to understand existing media and the cloud media tools to generate new media. Use ffmpeg, libvips/ImageMagick, ExifTool, or yt-dlp through \`bash\` for deterministic conversion, resizing, metadata, extraction, and download work.
- **Video fallback:** when \`look\` can take the whole video, prefer it and ask for timestamped audio-plus-visual evidence. For a model or workflow without video input, keep both channels: extract/transcribe the audio, then create a visual digest. Use \`scenedetect -i <video> detect-adaptive list-scenes save-images\` for a timestamped scene manifest and representative start/middle/end frames. Add a sparse uniform FFmpeg sample so long continuous shots retain temporal coverage; sample rapid or question-relevant intervals at a higher FPS. Preserve chronological order and timestamps in filenames/captions. Use a labeled contact sheet when one image is easier to pass than many frames, but keep enough per-frame resolution for text; OCR important screen text separately. Avoid near-duplicate frames and never infer motion or causality from a single still.

Prefer the narrowest capable path, write outputs into the workspace, and verify the resulting artifact before reporting completion.`;
  return {
    id: "sandbox-artifacts",
    heading: "Sandbox artifacts and heavyweight workflows",
    body,
  };
}

/** Pure markdown for the sandbox artifact playbook. */
export function buildSandboxArtifactsMarkdown(opts?: {
  tier?: InstructionTier | undefined;
}): string {
  return renderPromptSection(sandboxArtifactsSection(opts));
}

/**
 * Opt-in playbook for agents backed by Zo's standard sandbox image. Static
 * and session-stable so it remains prompt-cache safe.
 */
export function createSandboxArtifactsInstruction(opts?: {
  tier?: InstructionTier | undefined;
}) {
  const instruction = defineInstructions({
    markdown: buildSandboxArtifactsMarkdown(opts),
  });
  return defineDynamic({
    events: {
      "session.started": () => instruction,
    },
  });
}

// ---------------------------------------------------------------------------
// Delegation (subagents)
// ---------------------------------------------------------------------------

/** One declared subagent the delegation playbook should route work to. */
export interface SubagentRosterEntry {
  /** The subagent's tool name (its `agent/subagents/<id>/` directory name). */
  readonly name: string;
  /** When the parent should pick it, e.g. "read-only codebase questions". */
  readonly when: string;
}

/**
 * The delegation section for eve's built-in `agent` tool (a fresh clone with
 * a blank conversation) and, when `roster` names declared subagents, the
 * routing guidance between them.
 */
export function subagentSection(opts?: {
  /** What the prose calls the workspace ("repo", "project"…). */
  workspaceNoun?: string | undefined;
  /** Declared specialists to route to; omitted → clone-only guidance. */
  roster?: readonly SubagentRosterEntry[] | undefined;
  /** Prose depth; defaults to "full". */
  tier?: InstructionTier | undefined;
}): PromptSection {
  const noun = opts?.workspaceNoun ?? "workspace";
  const roster = opts?.roster;
  const compact = (opts?.tier ?? "full") === "compact";
  const rosterSection =
    roster && roster.length > 0
      ? compact
        ? `

Declared specialists (same \`{ message, outputSchema? }\` input):

${roster.map((entry) => `- **\`${entry.name}\`** — ${entry.when}.`).join("\n")}

Prefer the matching specialist; use the clone \`agent\` when none fits. Writing specialists share the non-overlapping write-scope rule; read-only ones fan out freely.`
        : `

### Choosing a subagent

Beyond the clone, you have declared specialists — each is its own tool with the same \`{ message, outputSchema? }\` input:

${roster.map((entry) => `- **\`${entry.name}\`** — ${entry.when}.`).join("\n")}

Prefer a specialist when its purpose or model tier matches the subtask; use the clone \`agent\` when none fits. A specialist that can edit shares the non-overlapping write-scope rule above; one that cannot write is safe to fan out freely.`
      : "";
  const body = compact
    ? `\`agent\` runs a focused subtask in a fresh clone of yourself — same tools and instructions, same ${noun}, but a **blank conversation**: the child sees only your \`message\`.

- Pack the message with everything the child needs: the exact deliverable, paths, constraints, context it can't discover cheaply.
- Fan out independent subtasks as several \`agent\` calls in one response; give parallel children non-overlapping write scopes — they share your ${noun}.
- Don't delegate what one or two direct tool calls would answer.
- Set \`outputSchema\` when you need structured output back.${rosterSection}`
    : `\`agent\` runs a focused subtask in a **fresh copy of yourself** — same tools and instructions, same ${noun}, but a **blank conversation**: the child sees only the \`message\` you send, none of your history. It's how you parallelize.

- **Pack the message with everything the child needs**: the exact deliverable, relevant paths, constraints, and any context it can't discover cheaply. A vague delegation wastes the whole child run.
- **Fan out independent subtasks in parallel**: emit several \`agent\` calls in one response — they run concurrently and all results return before you continue. Fan out only work that's genuinely independent.
- **Give parallel children non-overlapping write scopes** (different files or directories). They share your ${noun} and see each other's writes; overlapping edits clobber.
- **Don't delegate trivia.** A subtask that one or two direct tool calls would answer is faster done yourself; delegation pays off for self-contained work with real depth (multi-file exploration, an isolated fix + verify, a report).
- Set \`outputSchema\` when you need structured output back instead of prose.${rosterSection}`;
  return { id: "subagents", heading: "Delegating with the agent tool", body };
}

/** Pure markdown for the subagent delegation playbook. */
export function buildSubagentMarkdown(opts?: {
  workspaceNoun?: string | undefined;
  roster?: readonly SubagentRosterEntry[] | undefined;
  tier?: InstructionTier | undefined;
}): string {
  return renderPromptSection(subagentSection(opts));
}

/**
 * Delegation guidance for eve's built-in `agent` tool (a clone of the calling
 * agent) and, when `roster` names declared subagents, the routing guidance
 * between them. eve ships the tools but no playbook, and models under-use
 * them or pack children with too little context without one. Static markdown,
 * session-stable (prompt-cache safe), parameterized only at build time.
 */
export function createSubagentInstruction(opts?: {
  workspaceNoun?: string;
  roster?: readonly SubagentRosterEntry[] | undefined;
  tier?: InstructionTier | undefined;
}) {
  const instruction = defineInstructions({
    markdown: buildSubagentMarkdown(opts),
  });

  return defineDynamic({
    events: {
      "session.started": () => instruction,
    },
  });
}

// ---------------------------------------------------------------------------
// Tool authoring
// ---------------------------------------------------------------------------

/**
 * The tool-authoring contract section, for agents that WRITE eve tools (Zo's
 * Builder; any agent that edits another agent's `tools/` directory): the
 * naming, schema-shape, error, and prompt-cache rules the SDK's own tools
 * follow (`packages/agent-sdk/src/tools/AGENTS.md`,
 * `design/foundation/03-prior-aligned-naming.md`). Deliberately NOT part of
 * the baseline stack — most agents never author tools — wire it via
 * `extraInstructionSections`.
 */
export function toolAuthoringSection(opts?: {
  /** Prose depth; defaults to "full". */
  tier?: InstructionTier | undefined;
}): PromptSection {
  const body =
    (opts?.tier ?? "full") === "compact"
      ? `When you create or edit an eve tool module, follow the platform tool contract:

- snake_case tool names and params (\`generate_image\`, \`output_dir\`); the filename is the wire name. Prefer established names; \`path\`, not \`file_path\`.
- Flat \`z.object\`s of scalars — no arrays of objects, no nested unions; mutually exclusive options are two optional scalars with the exclusivity enforced in \`execute\`. Never \`.strict()\` a model-facing schema (unknown keys must strip, not reject).
- \`.describe(...)\` every param.
- A result key the model must pass back later uses the same name as the param that consumes it (\`task_id\` out → \`task_id\` in).
- Failures \`throw new Error(...)\` with corrective prose: what happened, that nothing changed, what to resend — never a raw fetch/zod/provider error. Success results are plain bounded JSON, no \`ok: true\` flags.
- Descriptions are static — never interpolate live state (counts, timestamps) into a description; per-call state belongs in results.`
      : `When you create or edit an eve tool (a \`tools/<name>.ts\` module), follow the platform's tool contract — models are measurably better at calling tools that match these priors:

- **Names and params are snake_case** (\`generate_image\`, \`output_dir\`, \`task_id\`), and the snake_case filename is the wire name the model sees. Prefer short established names over novel ones, and \`path\` over \`file_path\`.
- **Schemas are flat objects of scalars.** No arrays of objects and no nested unions in model-facing params — models garble high-entropy nested shapes. Make mutually exclusive options two optional scalars and enforce the exclusivity inside \`execute\` with a corrective error. Never call \`.strict()\` on a model-facing schema: an unknown extra key must strip (Zod's default), not bounce the whole call as a validation error.
- **Describe every param** with \`.describe(...)\` so the model fills it correctly.
- **Echo-back keys match param names.** When a result carries a value the model will pass to a later call, use the same key in both places — a result's \`task_id\` feeds a param named \`task_id\`, never \`taskId\`.
- **Failures are corrective prose, thrown.** \`throw new Error(...)\` with a message that names what happened, states that nothing changed, and says exactly what to resend — never let a raw fetch/zod/provider error or a stack trace reach the model. Success results are plain, bounded, JSON-serializable data; don't add \`ok: true\` flags (the throw is the failure channel).
- **Descriptions are static.** Never interpolate live state (counts, timestamps, current config) into a tool description — descriptions are part of the cached prompt prefix; per-call state belongs in tool results.`;
  return { id: "tool-authoring", heading: "Authoring tools", body };
}

/** Pure markdown for the tool-authoring contract; see {@link toolAuthoringSection}. */
export function buildToolAuthoringMarkdown(opts?: {
  tier?: InstructionTier | undefined;
}): string {
  return renderPromptSection(toolAuthoringSection(opts));
}

/**
 * The tool-authoring contract as a standalone à la carte instruction, for
 * agents that author eve tools. Static and session-stable (prompt-cache
 * safe). Stack consumers pass {@link toolAuthoringSection} through
 * `extraInstructionSections` instead.
 */
export function createToolAuthoringInstruction(opts?: {
  tier?: InstructionTier | undefined;
}) {
  const instruction = defineInstructions({ markdown: buildToolAuthoringMarkdown(opts) });
  return defineDynamic({
    events: {
      "session.started": () => instruction,
    },
  });
}

// ---------------------------------------------------------------------------
// The composed instruction stack
// ---------------------------------------------------------------------------

/**
 * The SDK's canonical section order — environment first (repo conventions),
 * then the core loop (workflow, planning), tool playbooks (parallel tools,
 * subagents, media), and the user-facing contracts last (asking, reporting).
 * These ids are the anchors for {@link PlacedPromptSection} placement and the
 * keys for omission. `media` appears only when an oracle is configured;
 * `repo-conventions` only when a local `workspaceRoot` is given.
 */
export const INSTRUCTION_STACK_SECTION_IDS = [
  "repo-conventions",
  "workflow",
  "planning",
  "parallel-tools",
  "subagents",
  "media",
  "hitl",
  "communication",
] as const;

/** A baseline stack section id — an omit key or a placement anchor. */
export type InstructionStackSectionId = (typeof INSTRUCTION_STACK_SECTION_IDS)[number];

/**
 * Options for the composed instruction stack: workspace + prose parameters
 * for the baseline sections, the depth tier, and the consumer-edit seams
 * (omit baseline sections, insert extras at anchors).
 */
export interface InstructionStackOptions {
  /**
   * Local workspace root — the repo-conventions section reads its `AGENTS.md`
   * off this process's own disk. Omit when the workspace isn't on that disk
   * (a sandbox-backed agent, where the files live in a remote session and
   * instruction resolvers have no sandbox access): the baseline then carries
   * no repo-conventions section — like `media` without an oracle — and
   * convention delivery rides the read tool's dir-conventions riders instead.
   */
  workspaceRoot?: string | undefined;
  /**
   * Prose depth for every section: `"full"` (default) or `"compact"` (~⅓ the
   * prose, same rules and tool names — for small/code-tuned models where a
   * long behavioral prompt crowds the context).
   */
  tier?: InstructionTier | undefined;
  /** What the prose calls the workspace ("repo", "project"…). */
  workspaceNoun?: string | undefined;
  /** Verify command the workflow section names (e.g. "bun run check"). */
  verifyCommandHint?: string | undefined;
  /** Declared subagents for the delegation section's routing guidance. */
  subagentRoster?: readonly SubagentRosterEntry[] | undefined;
  /**
   * The look oracle's identity, when wired — includes the media section.
   * Omitted → no media section (and extras anchored to `"media"` append at
   * the end).
   */
  media?:
    | {
        /** The oracle model's display name. */
        modelName: string;
        /** The oracle model's input capabilities. */
        capabilities: ModelInputCapabilities;
        /** The session model's own capabilities, when resolved. */
        parentCapabilities?: ModelInputCapabilities | undefined;
      }
    | undefined;
  /** Baseline sections to drop, by id. */
  omitSections?: readonly InstructionStackSectionId[] | undefined;
  /**
   * Consumer sections to insert at baseline anchors. Pass a function to defer
   * building until "session.started" — for sections that read the filesystem
   * per session (e.g. rib's skills catalog) while staying prompt-cache stable
   * within the session.
   */
  extraSections?:
    | readonly PlacedPromptSection[]
    | (() => readonly PlacedPromptSection[])
    | undefined;
}

/**
 * Build the stack's sections: the baseline in canonical order
 * (repo-conventions only with a local `workspaceRoot`, media only when an
 * oracle is wired), minus `omitSections`, plus `extraSections` at their
 * anchors. Pure given the filesystem (reads the root AGENTS.md) — the
 * tested core under {@link createInstructionStackInstruction}.
 */
export function buildInstructionStackSections(
  opts: InstructionStackOptions,
): PromptSection[] {
  const tier = opts.tier ?? "full";
  const workspaceNoun = opts.workspaceNoun;
  const baseline: PromptSection[] = [
    ...(opts.workspaceRoot !== undefined
      ? [repoConventionsSection({ workspaceRoot: opts.workspaceRoot })]
      : []),
    workflowSection({
      workspaceNoun,
      verifyCommandHint: opts.verifyCommandHint,
      tier,
    }),
    planningSection({ tier }),
    parallelToolsSection({ tier }),
    subagentSection({ workspaceNoun, roster: opts.subagentRoster, tier }),
    ...(opts.media ? [lookSection({ ...opts.media, tier })] : []),
    hitlSection({ tier }),
    communicationSection({ tier }),
  ];
  const extras =
    typeof opts.extraSections === "function"
      ? opts.extraSections()
      : opts.extraSections;
  return composePromptSections(baseline, { omit: opts.omitSections, extras });
}

/** The composed stack rendered to one markdown document. */
export function buildInstructionStackMarkdown(opts: InstructionStackOptions): string {
  return renderPromptSections(buildInstructionStackSections(opts));
}

/**
 * The whole baseline prompt as ONE dynamic instruction, in the SDK's
 * canonical section order. Prefer this over the per-section factories: eve
 * orders instruction slots alphabetically by filename, so per-file wiring
 * surrenders section order to filenames — the stack keeps it deliberate.
 * Builds on "session.started" (fresh AGENTS.md read, lazy extras evaluated),
 * so the prompt is byte-stable for the session's lifetime (prompt-cache
 * safe). Consumer persona/identity instructions stay separate files — the
 * stack ships operational contracts, not personality.
 */
export function createInstructionStackInstruction(opts: InstructionStackOptions) {
  return defineDynamic({
    events: {
      "session.started": () =>
        defineInstructions({ markdown: buildInstructionStackMarkdown(opts) }),
    },
  });
}
