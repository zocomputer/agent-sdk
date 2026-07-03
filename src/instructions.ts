import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineDynamic, defineInstructions } from "eve/instructions";

// eve ingests no AGENTS.md at runtime, so an eve agent working in a real repo
// needs the root conventions injected (every other harness — Cursor, Claude
// Code — reads them natively). The factory returns a dynamic instruction an
// agent re-exports from `agent/instructions/<name>.ts`; it rebuilds on
// "session.started" so edits take effect on the next chat, never mid-session
// (prompt-cache safe: the prompt is stable for a session's lifetime).

/** Pure markdown for the root-AGENTS.md section; "" when the file is absent. */
export function buildRepoConventionsMarkdown(workspaceRoot: string): string {
  let agents = "";
  try {
    agents = readFileSync(resolve(workspaceRoot, "AGENTS.md"), "utf8").trim();
  } catch {
    // No root AGENTS.md (e.g. the agent pointed at a non-repo dir) — inject nothing.
  }
  if (!agents) return "";
  return `## Repository conventions (root AGENTS.md)

These repo-wide conventions always apply. Nested directories add their own \`AGENTS.md\` — read those for the code you touch.

<root-agents-md>
${agents}
</root-agents-md>`;
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

/**
 * The workflow guidance for the stdlib's async tools (bash auto-backgrounding,
 * run_async/check_tasks/await_task). Static by design: dynamic instructions
 * are system messages — part of the cached prompt prefix — so live task state
 * belongs in tool results (check_tasks), never re-rendered here. See
 * journal/ben/rib/2026-07-01-prompt-cache-as-economic-constraint.md.
 */
export function createParallelToolsInstruction() {
  const instruction = defineInstructions({
    markdown: `## Parallel tool calls

Long-running work can continue in the **background** instead of blocking the turn. The \`bash\` tool does this automatically: if a command is still running after its short foreground wait, it returns a \`task_id\` and keeps the process alive. You can also use \`run_async\` when you already know the work should start in the background. After you start background work, decide whether your *next* action depends on its output:

- **Independent?** Keep working — read files, make edits, start other tasks — then \`check_tasks\` (non-blocking status + live output preview) or \`await_task\` (blocks for the result) when it's convenient.
- **Dependent?** Call \`await_task\` right away; treat it like a normal blocking call.

Guidance:
- Prefer plain \`bash\` for shell commands even when they might run long; it auto-returns a task handle if needed. Use \`run_async\` when you already know a command should start in the background and want to skip the foreground wait.
- You can have several tasks in flight at once. Each \`run_async\` returns a \`task_id\`; keep track of them.
- \`check_tasks\` shows status and live output previews for tasks that support progress. \`await_task\` returns the final output.
- For a long job where you only care about a specific signal — a failure line, a "listening on" banner — pass \`notify\` (\`{ pattern, reason }\`) to \`bash\` or \`run_async\` instead of polling: matching output is delivered to you as a message while you're idle. \`run_async\`'s \`notify_on_complete\` does the same when the task settles.
- Background task metadata and completed results persist across agent restarts. A task still running during a restart is reported as \`lost\`; start it again if its result still matters.
- Before finishing your turn, make sure any background task whose result matters has been awaited — don't end while relevant work is still running. If you're unsure what's still in flight, call \`check_tasks\`. A task you set a \`notify\` watcher on may keep running — its matches will reach you as messages.`,
  });

  return defineDynamic({
    events: {
      "session.started": () => instruction,
    },
  });
}

/** Pure markdown for the how-to-work contract; see createWorkflowInstruction. */
export function buildWorkflowMarkdown(opts?: {
  workspaceNoun?: string;
  verifyCommandHint?: string;
}): string {
  const noun = opts?.workspaceNoun ?? "workspace";
  const verify = opts?.verifyCommandHint
    ? ` (e.g. \`${opts.verifyCommandHint}\`)`
    : "";
  return `## How to work

1. **Explore before you edit.** Find the relevant code with \`glob\`/\`grep\` and \`read\` it — match the ${noun}'s existing patterns instead of guessing.
2. **Read a file before editing it**, so your edits target the current text. Prefer \`edit\` for targeted changes; use \`write\` for new files or full rewrites.
3. **Follow the surrounding conventions.** Match the style, structure, and idioms of the code around your change rather than imposing your own.
4. **Verify your work.** After changing code, run the relevant checks${verify} and fix what you broke. Leave the ${noun} in a working state.
5. **Track multi-step work** with \`todo\`, and keep it current as you finish each step.
6. **Finish the job before ending your turn.** Reread your final message: if it promises work ("I'll…"), lays out next steps you could take now, or asks a question you could answer yourself with a tool call, do that work instead of stopping. End your turn only when the task is complete or you're blocked on something only the user can provide.`;
}

/**
 * The how-to-work contract: explore→read→edit→verify, todo tracking, and the
 * end-of-turn completeness check. Static markdown, session-stable
 * (prompt-cache safe); the verify hint interpolates once at build time.
 */
export function createWorkflowInstruction(opts?: {
  workspaceNoun?: string;
  verifyCommandHint?: string;
}) {
  const instruction = defineInstructions({ markdown: buildWorkflowMarkdown(opts) });
  return defineDynamic({
    events: {
      "session.started": () => instruction,
    },
  });
}

/** Pure markdown for the reporting contract; see createCommunicationInstruction. */
export function buildCommunicationMarkdown(): string {
  return `## Communicating

- **Lead with the outcome.** The first sentence of your final message answers "what happened" — what changed, what you found, whether it worked. Supporting detail and reasoning come after, for readers who want them.
- **Readable beats brief.** Shorten by dropping detail that doesn't change what the reader does next — not by compressing prose into fragments, arrow chains, or bare jargon. Write complete sentences and name the specific thing (the actual file, function, or command), not "the relevant helper".
- **Report, don't fix, when the user is diagnosing.** If they're describing a problem or asking a question, the deliverable is your assessment: investigate and report. Apply a fix only when they ask for one.
- **Act within scope without asking.** For reversible actions that follow from the task, decide and proceed — asking "Should I…?" stalls the work. Stop to ask only for destructive or hard-to-reverse actions, or genuine scope changes the user must decide.
- **Report outcomes faithfully.** If a check fails, say so and include the output; if you skipped a step, say that; when something is done and verified, state it plainly without hedging.`;
}

/**
 * The reporting contract: lead with the outcome, keep prose readable,
 * assess-don't-fix when the user is diagnosing, act without permission-seeking
 * inside the task's scope. Static and session-stable (prompt-cache safe).
 */
export function createCommunicationInstruction() {
  const instruction = defineInstructions({ markdown: buildCommunicationMarkdown() });
  return defineDynamic({
    events: {
      "session.started": () => instruction,
    },
  });
}

/** Pure markdown for the ask_question playbook; see createHitlInstruction. */
export function buildHitlMarkdown(): string {
  return `## Asking the user (ask_question)

Call \`ask_question\` only when you're genuinely blocked on a choice that is the user's to make — not for permission to proceed with a reasonable default you can pick yourself. When you do ask:

- **Offer \`options\` when the choices are enumerable** instead of asking open-ended; each option is \`{ id, label, description?, style? }\` and the user answers with one click.
- **Put your recommended option first** and mark it \`style: "primary"\`. Use \`style: "danger"\` for destructive or hard-to-reverse choices.
- **Use each option's \`description\`** for the trade-off the label can't carry.
- **Keep free text open** (\`allowFreeform: true\`) unless the answer must be exactly one of the options.
- **Ask independent questions together**: emit several \`ask_question\` calls in one response — they collect into a single prompt and you get all the answers at once, instead of making the user answer serial round-trips.`;
}

/**
 * The ask_question playbook for eve's built-in HITL tool. The framework ships
 * the tool with a one-line description and no guidance on options, styles, or
 * when to ask; models under-use the structured surface without this. Static
 * and session-stable (prompt-cache safe).
 */
export function createHitlInstruction() {
  const instruction = defineInstructions({ markdown: buildHitlMarkdown() });
  return defineDynamic({
    events: {
      "session.started": () => instruction,
    },
  });
}

/** Pure markdown for the subagent delegation playbook. */
export function buildSubagentMarkdown(workspaceNoun = "workspace"): string {
  const noun = workspaceNoun;
  return `## Delegating with the agent tool

\`agent\` runs a focused subtask in a **fresh copy of yourself** — same tools and instructions, same ${noun}, but a **blank conversation**: the child sees only the \`message\` you send, none of your history. It's how you parallelize.

- **Pack the message with everything the child needs**: the exact deliverable, relevant paths, constraints, and any context it can't discover cheaply. A vague delegation wastes the whole child run.
- **Fan out independent subtasks in parallel**: emit several \`agent\` calls in one response — they run concurrently and all results return before you continue. Fan out only work that's genuinely independent.
- **Give parallel children non-overlapping write scopes** (different files or directories). They share your ${noun} and see each other's writes; overlapping edits clobber.
- **Don't delegate trivia.** A subtask that one or two direct tool calls would answer is faster done yourself; delegation pays off for self-contained work with real depth (multi-file exploration, an isolated fix + verify, a report).
- Set \`outputSchema\` when you need structured output back instead of prose.`;
}

/**
 * Delegation guidance for eve's built-in `agent` tool (a clone of the calling
 * agent). eve ships the tool but no playbook, and models under-use it or pack
 * children with too little context without one. Static markdown, session-stable
 * (prompt-cache safe), parameterized only at build time.
 */
export function createSubagentInstruction(opts?: { workspaceNoun?: string }) {
  const instruction = defineInstructions({
    markdown: buildSubagentMarkdown(opts?.workspaceNoun),
  });

  return defineDynamic({
    events: {
      "session.started": () => instruction,
    },
  });
}
