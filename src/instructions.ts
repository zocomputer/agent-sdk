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
- Background task metadata and completed results persist across agent restarts. A task still running during a restart is reported as \`lost\`; start it again if its result still matters.
- Before finishing your turn, make sure any background task whose result matters has been awaited — don't end while relevant work is still running. If you're unsure what's still in flight, call \`check_tasks\`.`,
  });

  return defineDynamic({
    events: {
      "session.started": () => instruction,
    },
  });
}
