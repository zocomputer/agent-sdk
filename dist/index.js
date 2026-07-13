// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/index.ts
import { tmpdir } from "node:os";
import { join as join7 } from "node:path";

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/async-tasks.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isTask(value) {
  if (!isRecord(value))
    return false;
  if (typeof value.id !== "string" || typeof value.tool !== "string" || typeof value.label !== "string" || typeof value.startedAt !== "number" || typeof value.status !== "string") {
    return false;
  }
  if (value.sessionId !== undefined && typeof value.sessionId !== "string")
    return false;
  switch (value.status) {
    case "running":
      return true;
    case "done":
      return typeof value.finishedAt === "number" && "result" in value;
    case "error":
    case "lost":
      return typeof value.finishedAt === "number" && typeof value.error === "string";
    default:
      return false;
  }
}
var MAX_TASKS = 100;
var REGISTRY_CACHE_KEY = Symbol.for("zocomputer.agent-sdk.task-registries");
function registryCache() {
  const holder = globalThis;
  holder[REGISTRY_CACHE_KEY] ??= new Map;
  return holder[REGISTRY_CACHE_KEY];
}
function __resetTaskRegistryCacheForTests() {
  registryCache().clear();
}
var STORE_POLL_MS = 500;
function abortReason(signal) {
  if (signal.reason instanceof Error)
    return signal.reason;
  return new DOMException("The tool call was cancelled", "AbortError");
}
function createWait(ms, abortSignal) {
  if (abortSignal === undefined) {
    let timer;
    const promise2 = new Promise((resolve) => {
      timer = setTimeout(resolve, ms);
    });
    return {
      promise: promise2,
      cancel() {
        if (timer !== undefined)
          clearTimeout(timer);
        timer = undefined;
      }
    };
  }
  if (abortSignal.aborted) {
    return {
      promise: Promise.reject(abortReason(abortSignal)),
      cancel() {}
    };
  }
  let cancel = () => {};
  const promise = new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      if (settled)
        return false;
      settled = true;
      clearTimeout(timer);
      abortSignal.removeEventListener("abort", onAbort);
      return true;
    };
    const onAbort = () => {
      if (!cleanup())
        return;
      reject(abortReason(abortSignal));
    };
    const timer = setTimeout(() => {
      if (!cleanup())
        return;
      resolve();
    }, ms);
    abortSignal.addEventListener("abort", onAbort, { once: true });
    cancel = () => {
      if (!cleanup())
        return;
      resolve();
    };
  });
  return { promise, cancel: () => cancel() };
}
function waitFor(ms, abortSignal) {
  return createWait(ms, abortSignal).promise;
}
function createTaskRegistry(opts) {
  const cache = registryCache();
  const cached = cache.get(opts.storePath);
  if (cached)
    return cached;
  const registry = buildTaskRegistry(opts);
  cache.set(opts.storePath, registry);
  return registry;
}
function buildTaskRegistry(opts) {
  const { storePath } = opts;
  const tasks = new Map;
  const pending = new Map;
  let counter = 0;
  function allTasks() {
    return [...tasks.values()].sort((a, b) => a.startedAt - b.startedAt);
  }
  function listTasks(sessionId) {
    const all = allTasks();
    if (sessionId === undefined)
      return all;
    return all.filter((t) => t.sessionId === undefined || t.sessionId === sessionId);
  }
  function persist() {
    mkdirSync(dirname(storePath), { recursive: true });
    writeFileSync(storePath, JSON.stringify({ tasks: allTasks() }, null, 2), "utf8");
  }
  function readStoreTasks() {
    if (!existsSync(storePath))
      return [];
    try {
      const parsed = JSON.parse(readFileSync(storePath, "utf8"));
      if (!isRecord(parsed) || !Array.isArray(parsed.tasks))
        return [];
      return parsed.tasks.filter(isTask);
    } catch {
      return [];
    }
  }
  function loadPersisted() {
    for (const saved of readStoreTasks()) {
      const task = saved.status === "running" ? {
        ...saved,
        status: "lost",
        finishedAt: Date.now(),
        error: "The agent restarted before this background task finished."
      } : saved;
      tasks.set(task.id, task);
      const match = task.id.match(/^task_(\d+)$/);
      const n = match ? Number(match[1]) : 0;
      if (Number.isFinite(n))
        counter = Math.max(counter, n);
    }
  }
  loadPersisted();
  function storeTask(id) {
    return readStoreTasks().find((task) => task.id === id);
  }
  function prune() {
    if (tasks.size <= MAX_TASKS)
      return;
    const settled = [...tasks.values()].filter((t) => t.status !== "running").sort((a, b) => a.startedAt - b.startedAt);
    for (const t of settled) {
      if (tasks.size <= MAX_TASKS)
        break;
      tasks.delete(t.id);
      pending.delete(t.id);
    }
    persist();
  }
  function spawnTask(tool, label, work, sessionId) {
    const id = `task_${++counter}`;
    const startedAt = Date.now();
    const scope = sessionId !== undefined ? { sessionId } : {};
    tasks.set(id, { id, tool, label, ...scope, startedAt, status: "running" });
    pending.set(id, work);
    work.then((result) => {
      tasks.set(id, {
        id,
        tool,
        label,
        ...scope,
        startedAt,
        status: "done",
        finishedAt: Date.now(),
        result
      });
      pending.delete(id);
      persist();
    }, (err) => {
      const error = err instanceof Error ? err.message : String(err);
      tasks.set(id, {
        id,
        tool,
        label,
        ...scope,
        startedAt,
        status: "error",
        finishedAt: Date.now(),
        error
      });
      pending.delete(id);
      persist();
    });
    prune();
    persist();
    return id;
  }
  return {
    spawnTask,
    updateTaskProgress(id, progress) {
      const task = tasks.get(id);
      if (!task || task.status !== "running")
        return;
      tasks.set(id, { ...task, progress });
    },
    listTasks,
    getTask(id) {
      return tasks.get(id) ?? storeTask(id);
    },
    async awaitTask(id, waitMs, abortSignal) {
      const current = tasks.get(id);
      if (current) {
        if (current.status !== "running")
          return current;
        const work = pending.get(id);
        if (work) {
          const wait = createWait(waitMs, abortSignal);
          try {
            await Promise.race([
              work.then(() => {
                return;
              }, () => {
                return;
              }),
              wait.promise
            ]);
          } finally {
            wait.cancel();
          }
        }
        return tasks.get(id);
      }
      const deadline = Date.now() + waitMs;
      for (;; ) {
        const saved = storeTask(id);
        if (!saved || saved.status !== "running")
          return saved;
        const remaining = deadline - Date.now();
        if (remaining <= 0)
          return saved;
        await waitFor(Math.min(STORE_POLL_MS, remaining), abortSignal);
      }
    }
  };
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/backgroundable.ts
import { z } from "zod";
function defineOp(cfg) {
  return {
    name: cfg.name,
    description: cfg.description,
    inputJsonSchema: z.toJSONSchema(cfg.inputSchema),
    start(rawInput, extras) {
      const parsed = cfg.inputSchema.safeParse(rawInput);
      if (!parsed.success) {
        throw new Error(`Invalid input for "${cfg.name}" — nothing was started. Fix the input to match the tool's schema (shown in the run_async catalog) and resend.
${z.prettifyError(parsed.error)}`);
      }
      const started = cfg.run(parsed.data, extras);
      if (started instanceof Promise)
        return { label: cfg.label(parsed.data), work: started };
      return { label: cfg.label(parsed.data), ...started };
    }
  };
}
function truncate(s, max = 80) {
  const oneLine = s.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}
function createBashOp(runner) {
  return defineOp({
    name: "bash",
    description: "Run a shell command in the background (git, bun, tests, builds, installs, dev servers). Same as the bash tool, but non-blocking.",
    inputSchema: z.object({
      command: z.string().min(1),
      cwd: z.string().optional(),
      timeout_ms: z.number().int().positive().optional()
    }),
    label: ({ command }) => truncate(command),
    run: ({ command, cwd, timeout_ms }, extras) => {
      const resolved = typeof runner === "function" ? runner(extras?.ctx) : runner;
      const running = resolved.startCommand(command, {
        cwd,
        timeoutMs: timeout_ms ?? 600000,
        onOutput: extras?.onOutput
      });
      return { work: running.result, progress: running.progress };
    }
  });
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/dir-conventions.ts
import { readFileSync as readFileSync2 } from "node:fs";
import { join } from "node:path";
var DEFAULT_MAX_BYTES_PER_FILE = 16 * 1024;
var DEFAULT_MAX_FILES_PER_READ = 4;
var DEFAULT_MAX_SESSIONS = 100;
function normalizeRel(relPath) {
  return relPath.split(/[\\/]+/).filter((s) => s.length > 0).join("/");
}
function dirChain(relPath) {
  const segments = normalizeRel(relPath).split("/").filter((s) => s.length > 0);
  const dirs = [];
  for (let i = 0;i < segments.length - 1; i++) {
    dirs.push(segments.slice(0, i + 1).join("/"));
  }
  return dirs;
}
function defaultLoadFile(absPath) {
  try {
    return readFileSync2(absPath, "utf8");
  } catch {
    return null;
  }
}
var TRACKER_CACHE_KEY = Symbol.for("zocomputer.agent-sdk.dir-conventions");
function trackerStateCache() {
  const holder = globalThis;
  holder[TRACKER_CACHE_KEY] ??= new Map;
  return holder[TRACKER_CACHE_KEY];
}
function __resetDirConventionsCacheForTests() {
  trackerStateCache().clear();
}
function createDirConventionsTracker(options) {
  const {
    workspaceRoot,
    fileName = "AGENTS.md",
    maxBytesPerFile = DEFAULT_MAX_BYTES_PER_FILE,
    maxFilesPerRead = DEFAULT_MAX_FILES_PER_READ,
    loadFile = defaultLoadFile,
    maxSessions = DEFAULT_MAX_SESSIONS
  } = options;
  const cache = trackerStateCache();
  const cacheKey = `${workspaceRoot}\x00${fileName}`;
  let state = cache.get(cacheKey);
  if (!state) {
    state = { sessions: new Map };
    cache.set(cacheKey, state);
  }
  const sessions = state.sessions;
  function deliveredSet(sessionId) {
    const existing = sessions.get(sessionId);
    if (existing) {
      sessions.delete(sessionId);
      sessions.set(sessionId, existing);
      return existing;
    }
    const set = new Set;
    sessions.set(sessionId, set);
    while (sessions.size > maxSessions) {
      const oldest = sessions.keys().next().value;
      if (oldest === undefined)
        break;
      sessions.delete(oldest);
    }
    return set;
  }
  return {
    async collect(sessionId, relPath, loadOverride) {
      if (!sessionId)
        return [];
      const load = loadOverride ?? loadFile;
      const delivered = deliveredSet(sessionId);
      const normalizedRel = normalizeRel(relPath);
      const found = [];
      for (const dir of dirChain(normalizedRel)) {
        if (delivered.has(dir))
          continue;
        const riderRel = `${dir}/${fileName}`;
        if (riderRel === normalizedRel) {
          delivered.add(dir);
          continue;
        }
        delivered.add(dir);
        let loaded;
        try {
          loaded = await load(join(workspaceRoot, riderRel));
        } catch {
          delivered.delete(dir);
          continue;
        }
        const content = loaded?.trim() ?? "";
        if (content.length === 0)
          continue;
        found.push({ dir, path: riderRel, content });
      }
      if (found.length === 0)
        return [];
      const inlineFrom = Math.max(0, found.length - maxFilesPerRead);
      return found.map(({ path, content }, index) => {
        if (index < inlineFrom || Buffer.byteLength(content, "utf8") > maxBytesPerFile) {
          return {
            path,
            note: `This directory has its own conventions — read ${path} before working here.`
          };
        }
        return { path, content };
      });
    }
  };
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/instructions.ts
import { readFileSync as readFileSync3 } from "node:fs";
import { resolve } from "node:path";
import { defineDynamic, defineInstructions } from "eve/instructions";

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/model-capabilities.ts
var TEXT_ONLY_CAPABILITIES = {
  image: false,
  pdf: false,
  video: false,
  audio: false
};
var MEDIA_CAPABILITY_OVERLAY = {
  google: { video: true, audio: true }
};
function capabilitiesFromCatalogEntry(entry) {
  const tags = entry.tags ?? [];
  return {
    image: tags.includes("vision"),
    pdf: tags.includes("file-input"),
    video: false,
    audio: false
  };
}
function modelFamily(modelId) {
  const slash = modelId.indexOf("/");
  return slash > 0 ? modelId.slice(0, slash).toLowerCase() : "";
}
function capabilitiesForModel(modelId, catalog) {
  const entry = catalog.find((model) => model.id === modelId);
  const base = entry ? capabilitiesFromCatalogEntry(entry) : TEXT_ONLY_CAPABILITIES;
  const overlay = MEDIA_CAPABILITY_OVERLAY[modelFamily(modelId)];
  if (overlay === undefined)
    return base;
  return {
    image: base.image || (overlay.image ?? false),
    pdf: base.pdf || (overlay.pdf ?? false),
    video: base.video || (overlay.video ?? false),
    audio: base.audio || (overlay.audio ?? false)
  };
}
var CAPABILITY_LABELS = [
  ["image", "images"],
  ["pdf", "PDFs"],
  ["video", "video"],
  ["audio", "audio"]
];
function joinList(items, conjunction) {
  if (items.length <= 1)
    return items[0] ?? "";
  if (items.length === 2)
    return `${items[0]} ${conjunction} ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, ${conjunction} ${items[items.length - 1]}`;
}
function describeCapabilities(caps) {
  const can = CAPABILITY_LABELS.filter(([key]) => caps[key]).map(([, label]) => label);
  const cannot = CAPABILITY_LABELS.filter(([key]) => !caps[key]).map(([, label]) => label);
  if (can.length === 0)
    return "can view text only (no images, PDFs, video, or audio)";
  if (cannot.length === 0)
    return `can view ${joinList(can, "and")}`;
  return `can view ${joinList(can, "and")}, but not ${joinList(cannot, "or")}`;
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/prompt-sections.ts
function renderPromptSection(section) {
  const body = section.body.trim();
  if (body === "")
    return "";
  return `## ${section.heading}

${body}`;
}
function renderPromptSections(sections) {
  return sections.map(renderPromptSection).filter((rendered) => rendered !== "").join(`

`);
}
function composePromptSections(baseline, options) {
  const omit = new Set(options?.omit ?? []);
  const kept = baseline.filter((section) => !omit.has(section.id));
  const keptIds = new Set(kept.map((section) => section.id));
  const before = new Map;
  const after = new Map;
  const trailing = [];
  for (const extra of options?.extras ?? []) {
    const placement = extra.placement;
    const anchor = placement === undefined ? undefined : ("before" in placement) ? placement.before : placement.after;
    if (anchor === undefined || !keptIds.has(anchor)) {
      trailing.push(extra.section);
      continue;
    }
    const bucket = placement !== undefined && "before" in placement ? before : after;
    const list = bucket.get(anchor) ?? [];
    list.push(extra.section);
    bucket.set(anchor, list);
  }
  const composed = [];
  for (const section of kept) {
    composed.push(...before.get(section.id) ?? []);
    composed.push(section);
    composed.push(...after.get(section.id) ?? []);
  }
  composed.push(...trailing);
  return composed;
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/instructions.ts
function repoConventionsSection(opts) {
  let agents = "";
  try {
    agents = readFileSync3(resolve(opts.workspaceRoot, "AGENTS.md"), "utf8").trim();
  } catch {}
  return {
    id: "repo-conventions",
    heading: "Repository conventions (root AGENTS.md)",
    body: agents ? `These repo-wide conventions always apply. Nested directories add their own \`AGENTS.md\` — read those for the code you touch.

<root-agents-md>
${agents}
</root-agents-md>` : ""
  };
}
function buildRepoConventionsMarkdown(workspaceRoot) {
  return renderPromptSection(repoConventionsSection({ workspaceRoot }));
}
function createRepoConventionsInstruction(opts) {
  const { workspaceRoot } = opts;
  return defineDynamic({
    events: {
      "session.started": () => defineInstructions({ markdown: buildRepoConventionsMarkdown(workspaceRoot) })
    }
  });
}
function workflowSection(opts) {
  const noun = opts?.workspaceNoun ?? "workspace";
  const verify = opts?.verifyCommandHint ? ` (e.g. \`${opts.verifyCommandHint}\`)` : "";
  const body = (opts?.tier ?? "full") === "compact" ? `- Explore with \`glob\`/\`grep\` and \`read\` before editing; match the ${noun}'s existing patterns.
- Read a file before editing it. \`edit\` for targeted changes; \`write\` for new files or full rewrites.
- Fixing a bug? Write a minimal reproduction (a failing test or script), run it to confirm the failure, fix, then re-run it to confirm the failure is gone.
- After changing code, run the relevant checks${verify} and fix what you broke.
- Track multi-step work with \`todo\`.
- Don't end your turn on promised work ("I'll…"), next steps you could take now, or a question a tool call could answer — do the work, or report what blocks it.` : `1. **Explore before you edit.** Find the relevant code with \`glob\`/\`grep\` and \`read\` it — match the ${noun}'s existing patterns instead of guessing.
2. **Read a file before editing it**, so your edits target the current text. Prefer \`edit\` for targeted changes; use \`write\` for new files or full rewrites.
3. **Follow the surrounding conventions.** Match the style, structure, and idioms of the code around your change rather than imposing your own.
4. **Reproduce a bug before you fix it.** When the task is a bug fix, write a minimal reproduction — a failing test, or a small script — and run it to confirm the failure before changing code. After the fix, re-run the reproduction to prove the failure is gone; prefer a test-shaped repro that stays in the suite so the bug stays fixed. A fix you never watched fail is a guess.
5. **Verify your work.** After changing code, run the relevant checks${verify} and fix what you broke. Leave the ${noun} in a working state.
6. **Track multi-step work** with \`todo\`, and keep it current as you finish each step.
7. **Finish the job before ending your turn.** Reread your final message: if it promises work ("I'll…"), lays out next steps you could take now, or asks a question you could answer yourself with a tool call, do that work instead of stopping. End your turn only when the task is complete or you're blocked on something only the user can provide.`;
  return { id: "workflow", heading: "How to work", body };
}
function buildWorkflowMarkdown(opts) {
  return renderPromptSection(workflowSection(opts));
}
function createWorkflowInstruction(opts) {
  const instruction = defineInstructions({ markdown: buildWorkflowMarkdown(opts) });
  return defineDynamic({
    events: {
      "session.started": () => instruction
    }
  });
}
function planningSection(opts) {
  const body = (opts?.tier ?? "full") === "compact" ? `- Track any multi-step task with \`todo\`; skip the list for a single obvious action.
- Steps are specific and verifiable — no filler items ("investigate", "final polish").
- Keep exactly one item \`in_progress\`; mark items \`completed\` the moment they're done, not batched at the end.
- Each \`todo\` write replaces the whole list — always send every item.
- Rewrite the plan when scope changes; mark obsolete items \`cancelled\`.
- End your turn with every item \`completed\` or \`cancelled\`.` : `Use the \`todo\` tool as your live plan for any multi-step task — the user watches it to follow your progress.

- **Plan real tasks, skip trivia.** A task with several distinct steps (or real ambiguity about the approach) gets a todo list up front; a single obvious action doesn't need one.
- **Make steps specific and verifiable.** Each item names concrete work with a clear done-state, not a vague direction. No filler steps ("investigate", "final polish"), and don't pad a two-step task into five.
- **Keep exactly one item \`in_progress\`.** Mark it before you start that work, and mark it \`completed\` the moment it's done — don't batch completions at the end.
- **Each write replaces the whole list**, so always send every item, not a delta.
- **Rewrite the plan when the task changes.** New discoveries or a scope pivot mean updating the list to match reality — mark items that no longer apply \`cancelled\` rather than leaving them pending.
- **Don't restate the list in prose.** The user sees the todo list itself; your messages should carry what it can't.
- **End your turn with every item \`completed\` or \`cancelled\`.** An item still \`pending\` or \`in_progress\` means the work isn't done — finish it or say what blocks it.`;
  return { id: "planning", heading: "Planning your work (todo)", body };
}
function buildPlanningMarkdown(opts) {
  return renderPromptSection(planningSection(opts));
}
function createPlanningInstruction(opts) {
  const instruction = defineInstructions({ markdown: buildPlanningMarkdown(opts) });
  return defineDynamic({
    events: {
      "session.started": () => instruction
    }
  });
}
function parallelToolsSection(opts) {
  const body = (opts?.tier ?? "full") === "compact" ? [
    `Long-running work continues in the **background**: \`bash\` auto-returns a \`task_id\` when a command outlives its short foreground wait; \`run_async\` starts there directly.`,
    ``,
    `- Next action independent of the result? Keep working, then \`check_tasks\` (non-blocking status) or \`await_task\` (blocks for the result). Dependent? \`await_task\` right away.`,
    `- Several tasks can run at once — track their \`task_id\`s.`,
    `- When you do poll on wall-clock time, keep each blocking call under ~4 minutes — one long silent call lets the provider prompt cache expire and re-prices your whole context.`,
    `- Completed results survive restarts; a task running through a restart reports \`lost\` — start it again if it still matters.`,
    `- Before ending your turn, await every task whose result matters (\`check_tasks\` if unsure what's in flight).`
  ].join(`
`) : [
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
    `- Before finishing your turn, make sure any background task whose result matters has been awaited — don't end while relevant work is still running. If you're unsure what's still in flight, call \`check_tasks\`.`
  ].join(`
`);
  return { id: "parallel-tools", heading: "Parallel tool calls", body };
}
function buildParallelToolsMarkdown(opts) {
  return renderPromptSection(parallelToolsSection(opts));
}
function createParallelToolsInstruction(opts) {
  const instruction = defineInstructions({
    markdown: buildParallelToolsMarkdown(opts)
  });
  return defineDynamic({
    events: {
      "session.started": () => instruction
    }
  });
}
function communicationSection(opts) {
  const body = (opts?.tier ?? "full") === "compact" ? `- Lead with the outcome: the first sentence says what changed, what you found, whether it worked.
- Readable beats brief — complete sentences, and name the specific file, function, or command, not "the relevant helper".
- When the user is diagnosing, investigate and report; apply a fix only when asked.
- Act within scope without asking permission; stop only for destructive or hard-to-reverse actions, or genuine scope changes.
- Report faithfully: a failed check gets said with its output, a skipped step gets named, done-and-verified gets stated plainly.` : `- **Lead with the outcome.** The first sentence of your final message answers "what happened" — what changed, what you found, whether it worked. Supporting detail and reasoning come after, for readers who want them.
- **Readable beats brief.** Shorten by dropping detail that doesn't change what the reader does next — not by compressing prose into fragments, arrow chains, or bare jargon. Write complete sentences and name the specific thing (the actual file, function, or command), not "the relevant helper".
- **Report, don't fix, when the user is diagnosing.** If they're describing a problem or asking a question, the deliverable is your assessment: investigate and report. Apply a fix only when they ask for one.
- **Act within scope without asking.** For reversible actions that follow from the task, decide and proceed — asking "Should I…?" stalls the work. Stop to ask only for destructive or hard-to-reverse actions, or genuine scope changes the user must decide.
- **Report outcomes faithfully.** If a check fails, say so and include the output; if you skipped a step, say that; when something is done and verified, state it plainly without hedging.`;
  return { id: "communication", heading: "Communicating", body };
}
function buildCommunicationMarkdown(opts) {
  return renderPromptSection(communicationSection(opts));
}
function createCommunicationInstruction(opts) {
  const instruction = defineInstructions({
    markdown: buildCommunicationMarkdown(opts)
  });
  return defineDynamic({
    events: {
      "session.started": () => instruction
    }
  });
}
function hitlSection(opts) {
  const body = (opts?.tier ?? "full") === "compact" ? `Call \`ask_question\` only when you're blocked on a choice that is the user's to make — never for permission to proceed with a reasonable default.

- Enumerable choices → \`options\` (each \`{ id, label, description?, style? }\`); put your recommendation first with \`style: "primary"\`, use \`style: "danger"\` for destructive choices.
- Keep \`allowFreeform: true\` unless the answer must be exactly one of the options.
- Ask independent questions as several \`ask_question\` calls in one response — they collect into a single prompt with all answers at once.` : `Call \`ask_question\` only when you're genuinely blocked on a choice that is the user's to make — not for permission to proceed with a reasonable default you can pick yourself. When you do ask:

- **Offer \`options\` when the choices are enumerable** instead of asking open-ended; each option is \`{ id, label, description?, style? }\` and the user answers with one click.
- **Put your recommended option first** and mark it \`style: "primary"\`. Use \`style: "danger"\` for destructive or hard-to-reverse choices.
- **Use each option's \`description\`** for the trade-off the label can't carry.
- **Keep free text open** (\`allowFreeform: true\`) unless the answer must be exactly one of the options.
- **Ask independent questions together**: emit several \`ask_question\` calls in one response — they collect into a single prompt and you get all the answers at once, instead of making the user answer serial round-trips.`;
  return { id: "hitl", heading: "Asking the user (ask_question)", body };
}
function buildHitlMarkdown(opts) {
  return renderPromptSection(hitlSection(opts));
}
function createHitlInstruction(opts) {
  const instruction = defineInstructions({ markdown: buildHitlMarkdown(opts) });
  return defineDynamic({
    events: {
      "session.started": () => instruction
    }
  });
}
function lookSection(opts) {
  const oraclePhrase = describeCapabilities(opts.capabilities);
  const parentSentence = opts.parentCapabilities ? ` Your own model ${describeCapabilities(opts.parentCapabilities)}.` : "";
  const body = (opts.tier ?? "full") === "compact" ? `The \`look\` tool delegates one question about a media file you can't view to ${opts.modelName} — a model that ${oraclePhrase} — and returns its answer as text.${parentSentence}

- Documents (PDF, DOCX, spreadsheets) convert to text through \`read\` — no delegation needed.
- Prefer \`read\` for media it can deliver; when it returns metadata only, its note names the right move.
- \`look\` at kinds outside your own input support: pass the path and a self-contained question.
- Ask for the deliverable (transcribe, describe, summarize), not a viewing — the model sees only the file and your prompt.` : `Some files carry content your model can't take as input.${parentSentence} The \`look\` tool delegates one question about a media file to ${opts.modelName} — a model that ${oraclePhrase} — sending the file's bytes and your prompt in a single call and returning the answer as text.

- **Documents come back as text.** PDFs, DOCX, and spreadsheets convert through \`read\` — no delegation needed for their text.
- **Prefer \`read\` for media it can deliver.** When \`read\` can put a media file in front of you it says so in its result; when it returns metadata only, its note names the right move.
- **\`look\` at what you can't view.** For kinds outside your own input support (or when a read note points there), pass the path and a self-contained question to \`look\` instead of reporting a dead end.
- **Ask for the deliverable, not a viewing.** The model sees only the file and your prompt — request the specific extraction you need (transcribe the visible text, describe the layout, summarize the recording) so one answer suffices.`;
  return { id: "media", heading: "Media you can't view (look)", body };
}
function buildLookMarkdown(opts) {
  return renderPromptSection(lookSection(opts));
}
function createLookInstruction(opts) {
  const instruction = defineInstructions({ markdown: buildLookMarkdown(opts) });
  return defineDynamic({
    events: {
      "session.started": () => instruction
    }
  });
}
function subagentSection(opts) {
  const noun = opts?.workspaceNoun ?? "workspace";
  const roster = opts?.roster;
  const compact = (opts?.tier ?? "full") === "compact";
  const rosterSection = roster && roster.length > 0 ? compact ? `

Declared specialists (same \`{ message, outputSchema? }\` input):

${roster.map((entry) => `- **\`${entry.name}\`** — ${entry.when}.`).join(`
`)}

Prefer the matching specialist; use the clone \`agent\` when none fits. Writing specialists share the non-overlapping write-scope rule; read-only ones fan out freely.` : `

### Choosing a subagent

Beyond the clone, you have declared specialists — each is its own tool with the same \`{ message, outputSchema? }\` input:

${roster.map((entry) => `- **\`${entry.name}\`** — ${entry.when}.`).join(`
`)}

Prefer a specialist when its purpose or model tier matches the subtask; use the clone \`agent\` when none fits. A specialist that can edit shares the non-overlapping write-scope rule above; one that cannot write is safe to fan out freely.` : "";
  const body = compact ? `\`agent\` runs a focused subtask in a fresh clone of yourself — same tools and instructions, same ${noun}, but a **blank conversation**: the child sees only your \`message\`.

- Pack the message with everything the child needs: the exact deliverable, paths, constraints, context it can't discover cheaply.
- Fan out independent subtasks as several \`agent\` calls in one response; give parallel children non-overlapping write scopes — they share your ${noun}.
- Don't delegate what one or two direct tool calls would answer.
- Set \`outputSchema\` when you need structured output back.${rosterSection}` : `\`agent\` runs a focused subtask in a **fresh copy of yourself** — same tools and instructions, same ${noun}, but a **blank conversation**: the child sees only the \`message\` you send, none of your history. It's how you parallelize.

- **Pack the message with everything the child needs**: the exact deliverable, relevant paths, constraints, and any context it can't discover cheaply. A vague delegation wastes the whole child run.
- **Fan out independent subtasks in parallel**: emit several \`agent\` calls in one response — they run concurrently and all results return before you continue. Fan out only work that's genuinely independent.
- **Give parallel children non-overlapping write scopes** (different files or directories). They share your ${noun} and see each other's writes; overlapping edits clobber.
- **Don't delegate trivia.** A subtask that one or two direct tool calls would answer is faster done yourself; delegation pays off for self-contained work with real depth (multi-file exploration, an isolated fix + verify, a report).
- Set \`outputSchema\` when you need structured output back instead of prose.${rosterSection}`;
  return { id: "subagents", heading: "Delegating with the agent tool", body };
}
function buildSubagentMarkdown(opts) {
  return renderPromptSection(subagentSection(opts));
}
function createSubagentInstruction(opts) {
  const instruction = defineInstructions({
    markdown: buildSubagentMarkdown(opts)
  });
  return defineDynamic({
    events: {
      "session.started": () => instruction
    }
  });
}
function toolAuthoringSection(opts) {
  const body = (opts?.tier ?? "full") === "compact" ? `When you create or edit an eve tool module, follow the platform tool contract:

- snake_case tool names and params (\`generate_image\`, \`output_dir\`); the filename is the wire name. Prefer established names; \`path\`, not \`file_path\`.
- Flat \`z.object\`s of scalars — no arrays of objects, no nested unions; mutually exclusive options are two optional scalars with the exclusivity enforced in \`execute\`. Never \`.strict()\` a model-facing schema (unknown keys must strip, not reject).
- \`.describe(...)\` every param.
- A result key the model must pass back later uses the same name as the param that consumes it (\`task_id\` out → \`task_id\` in).
- Failures \`throw new Error(...)\` with corrective prose: what happened, that nothing changed, what to resend — never a raw fetch/zod/provider error. Success results are plain bounded JSON, no \`ok: true\` flags.
- Descriptions are static — never interpolate live state (counts, timestamps) into a description; per-call state belongs in results.` : `When you create or edit an eve tool (a \`tools/<name>.ts\` module), follow the platform's tool contract — models are measurably better at calling tools that match these priors:

- **Names and params are snake_case** (\`generate_image\`, \`output_dir\`, \`task_id\`), and the snake_case filename is the wire name the model sees. Prefer short established names over novel ones, and \`path\` over \`file_path\`.
- **Schemas are flat objects of scalars.** No arrays of objects and no nested unions in model-facing params — models garble high-entropy nested shapes. Make mutually exclusive options two optional scalars and enforce the exclusivity inside \`execute\` with a corrective error. Never call \`.strict()\` on a model-facing schema: an unknown extra key must strip (Zod's default), not bounce the whole call as a validation error.
- **Describe every param** with \`.describe(...)\` so the model fills it correctly.
- **Echo-back keys match param names.** When a result carries a value the model will pass to a later call, use the same key in both places — a result's \`task_id\` feeds a param named \`task_id\`, never \`taskId\`.
- **Failures are corrective prose, thrown.** \`throw new Error(...)\` with a message that names what happened, states that nothing changed, and says exactly what to resend — never let a raw fetch/zod/provider error or a stack trace reach the model. Success results are plain, bounded, JSON-serializable data; don't add \`ok: true\` flags (the throw is the failure channel).
- **Descriptions are static.** Never interpolate live state (counts, timestamps, current config) into a tool description — descriptions are part of the cached prompt prefix; per-call state belongs in tool results.`;
  return { id: "tool-authoring", heading: "Authoring tools", body };
}
function buildToolAuthoringMarkdown(opts) {
  return renderPromptSection(toolAuthoringSection(opts));
}
function createToolAuthoringInstruction(opts) {
  const instruction = defineInstructions({ markdown: buildToolAuthoringMarkdown(opts) });
  return defineDynamic({
    events: {
      "session.started": () => instruction
    }
  });
}
var INSTRUCTION_STACK_SECTION_IDS = [
  "repo-conventions",
  "workflow",
  "planning",
  "parallel-tools",
  "subagents",
  "media",
  "hitl",
  "communication"
];
function buildInstructionStackSections(opts) {
  const tier = opts.tier ?? "full";
  const workspaceNoun = opts.workspaceNoun;
  const baseline = [
    ...opts.workspaceRoot !== undefined ? [repoConventionsSection({ workspaceRoot: opts.workspaceRoot })] : [],
    workflowSection({
      workspaceNoun,
      verifyCommandHint: opts.verifyCommandHint,
      tier
    }),
    planningSection({ tier }),
    parallelToolsSection({ tier }),
    subagentSection({ workspaceNoun, roster: opts.subagentRoster, tier }),
    ...opts.media ? [lookSection({ ...opts.media, tier })] : [],
    hitlSection({ tier }),
    communicationSection({ tier })
  ];
  const extras = typeof opts.extraSections === "function" ? opts.extraSections() : opts.extraSections;
  return composePromptSections(baseline, { omit: opts.omitSections, extras });
}
function buildInstructionStackMarkdown(opts) {
  return renderPromptSections(buildInstructionStackSections(opts));
}
function createInstructionStackInstruction(opts) {
  return defineDynamic({
    events: {
      "session.started": () => defineInstructions({ markdown: buildInstructionStackMarkdown(opts) })
    }
  });
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/tools/bash.ts
import { defineTool } from "eve/tools";
import { z as z2 } from "zod";
var DEFAULT_INTERACTIVE_HINT = "This is a piped shell with NO tty: avoid interactive or full-screen CLIs (a REPL, vim, an interactive installer/prompt) — those programs hang or degrade without a real terminal.";
function abortReason2(signal) {
  if (signal.reason instanceof Error)
    return signal.reason;
  return new DOMException("The tool call was cancelled", "AbortError");
}
function createBashTool(opts) {
  const { workdir, registry, noun } = opts;
  const execEnv = opts.execEnv ?? "host";
  const interactiveHint = opts.interactiveHint ?? DEFAULT_INTERACTIVE_HINT;
  const resolveRunner = (ctx) => typeof opts.runner === "function" ? opts.runner(ctx) : opts.runner;
  const description = [
    execEnv === "sandbox" ? `Run a shell command inside the session's workspace sandbox, from the ${noun} root by default.` : `Run a shell command on the host, from the ${noun} root by default.`,
    "Quick commands return normally. If the command is still running after foreground_ms, it keeps running in the background and returns a task_id plus current stdout/stderr; use check_tasks and await_task to monitor or collect the result.",
    "Use it for git, tests/builds/type-checks, ripgrep, dev servers, and anything the file tools don't cover. Very long output is truncated to its head and tail; the complete output is saved to a file named in the result — grep or read that file instead of re-running the command.",
    execEnv === "sandbox" ? "This is a real shell inside the workspace sandbox with no undo — be careful with destructive commands." : "This is a real shell on the user's machine with no sandbox and no undo — be careful with destructive commands.",
    interactiveHint
  ].join(" ");
  const baseParams = {
    command: z2.string().min(1).describe("The shell command to run."),
    cwd: z2.string().optional().describe(`Working directory, relative to the ${noun} root. Defaults to the ${noun} root.`),
    timeout_ms: z2.number().int().positive().optional().describe("Kill the command after this many milliseconds (default 600000)."),
    foreground_ms: z2.number().int().positive().optional().describe("How long to wait before returning a background task handle (default 2000).")
  };
  async function runBash(args, ctx) {
    const { command, cwd, timeout_ms, foreground_ms } = args;
    const runner = resolveRunner(ctx);
    const running = runner.startCommand(command, {
      cwd,
      timeoutMs: timeout_ms ?? 600000
    });
    const signal = ctx?.abortSignal;
    const result = await new Promise((resolve2, reject) => {
      let settled = false;
      let removeAbortListener = () => {};
      const foregroundTimer = setTimeout(() => {
        if (settled)
          return;
        settled = true;
        removeAbortListener();
        resolve2(null);
      }, foreground_ms ?? 2000);
      const settle = () => {
        if (settled)
          return false;
        settled = true;
        clearTimeout(foregroundTimer);
        removeAbortListener();
        return true;
      };
      const onAbort = (abortedSignal) => {
        if (!settle())
          return;
        running.kill();
        reject(abortReason2(abortedSignal));
      };
      if (signal !== undefined) {
        if (signal.aborted) {
          onAbort(signal);
        } else {
          const handleAbort = () => onAbort(signal);
          signal.addEventListener("abort", handleAbort, { once: true });
          removeAbortListener = () => signal.removeEventListener("abort", handleAbort);
        }
      }
      running.result.then((completed) => {
        if (settle())
          resolve2(completed);
      }, (error) => {
        if (settle())
          reject(error);
      });
    });
    if (result !== null) {
      return {
        workdir,
        mode: "completed",
        exitCode: result.exitCode,
        timedOut: result.timedOut,
        stdout: result.stdout,
        stderr: result.stderr
      };
    }
    const taskId = registry.spawnTask("bash", command, running.result, ctx?.session?.id);
    registry.updateTaskProgress(taskId, running.progress());
    const interval = setInterval(() => registry.updateTaskProgress(taskId, running.progress()), 500);
    running.result.finally(() => clearInterval(interval)).catch(() => {
      return;
    });
    return {
      workdir,
      mode: "backgrounded",
      task_id: taskId,
      status: "running",
      progress: running.progress(),
      note: "Command is still running in the background. Continue independent work, then call check_tasks for live output or await_task when you need the final result."
    };
  }
  return defineTool({
    description,
    inputSchema: z2.object(baseParams),
    execute: (args, ctx) => runBash(args, ctx)
  });
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/tools/edit.ts
import { defineTool as defineTool2 } from "eve/tools";
import { z as z3 } from "zod";

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/edit-match.ts
class EditNotFoundError extends Error {
  constructor() {
    super("old_string not found. It must match the file contents exactly, including whitespace and indentation.");
    this.name = "EditNotFoundError";
  }
}

class EditNotUniqueError extends Error {
  constructor() {
    super("old_string is not unique. Add surrounding context to make the match unique, or set replace_all.");
    this.name = "EditNotUniqueError";
  }
}

class EditDisproportionateError extends Error {
  constructor() {
    super("Refusing replacement because the matched span is much larger than old_string. Re-read the file and provide the full exact old_string for the intended replacement.");
    this.name = "EditDisproportionateError";
  }
}
var BLOCK_ANCHOR_SIMILARITY_THRESHOLD = 0.65;
function levenshtein(a, b) {
  if (a === "" || b === "")
    return Math.max(a.length, b.length);
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1;i <= a.length; i++) {
    const curr = [i];
    for (let j = 1;j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr.push(Math.min((prev[j] ?? 0) + 1, (curr[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost));
    }
    prev = curr;
  }
  return prev[b.length] ?? 0;
}
var SimpleReplacer = function* (_content, find) {
  yield find;
};
var LineTrimmedReplacer = function* (content, find) {
  const originalLines = content.split(`
`);
  const searchLines = find.split(`
`);
  if (searchLines[searchLines.length - 1] === "") {
    searchLines.pop();
  }
  for (let i = 0;i <= originalLines.length - searchLines.length; i++) {
    let matches = true;
    for (const [j, searchLine] of searchLines.entries()) {
      const originalLine = originalLines[i + j];
      if (originalLine === undefined || originalLine.trim() !== searchLine.trim()) {
        matches = false;
        break;
      }
    }
    if (matches) {
      let matchStartIndex = 0;
      for (let k = 0;k < i; k++) {
        matchStartIndex += (originalLines[k] ?? "").length + 1;
      }
      let matchEndIndex = matchStartIndex;
      for (let k = 0;k < searchLines.length; k++) {
        matchEndIndex += (originalLines[i + k] ?? "").length;
        if (k < searchLines.length - 1) {
          matchEndIndex += 1;
        }
      }
      yield content.substring(matchStartIndex, matchEndIndex);
    }
  }
};
function blockSimilarity(originalLines, searchLines, startLine, endLine) {
  const searchBlockSize = searchLines.length;
  const actualBlockSize = endLine - startLine + 1;
  const linesToCheck = Math.min(searchBlockSize - 2, actualBlockSize - 2);
  if (linesToCheck <= 0)
    return 1;
  let similarity = 0;
  for (let j = 1;j < searchBlockSize - 1 && j < actualBlockSize - 1; j++) {
    const originalLine = (originalLines[startLine + j] ?? "").trim();
    const searchLine = (searchLines[j] ?? "").trim();
    const maxLen = Math.max(originalLine.length, searchLine.length);
    if (maxLen === 0)
      continue;
    const distance = levenshtein(originalLine, searchLine);
    similarity += 1 - distance / maxLen;
  }
  return similarity / linesToCheck;
}
function lineSpan(content, originalLines, startLine, endLine) {
  let matchStartIndex = 0;
  for (let k = 0;k < startLine; k++) {
    matchStartIndex += (originalLines[k] ?? "").length + 1;
  }
  let matchEndIndex = matchStartIndex;
  for (let k = startLine;k <= endLine; k++) {
    matchEndIndex += (originalLines[k] ?? "").length;
    if (k < endLine) {
      matchEndIndex += 1;
    }
  }
  return content.substring(matchStartIndex, matchEndIndex);
}
var BlockAnchorReplacer = function* (content, find) {
  const originalLines = content.split(`
`);
  const searchLines = find.split(`
`);
  if (searchLines.length < 3) {
    return;
  }
  if (searchLines[searchLines.length - 1] === "") {
    searchLines.pop();
  }
  const firstLineSearch = (searchLines[0] ?? "").trim();
  const lastLineSearch = (searchLines[searchLines.length - 1] ?? "").trim();
  const searchBlockSize = searchLines.length;
  const maxLineDelta = Math.max(1, Math.floor(searchBlockSize * 0.25));
  const candidates = [];
  for (const [i, line] of originalLines.entries()) {
    if (line.trim() !== firstLineSearch) {
      continue;
    }
    for (let j = i + 2;j < originalLines.length; j++) {
      if ((originalLines[j] ?? "").trim() === lastLineSearch) {
        const actualBlockSize = j - i + 1;
        if (Math.abs(actualBlockSize - searchBlockSize) <= maxLineDelta) {
          candidates.push({ startLine: i, endLine: j });
        }
        break;
      }
    }
  }
  if (candidates.length === 0) {
    return;
  }
  let best = null;
  let maxSimilarity = -1;
  for (const candidate of candidates) {
    const similarity = blockSimilarity(originalLines, searchLines, candidate.startLine, candidate.endLine);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      best = candidate;
    }
  }
  if (best && maxSimilarity >= BLOCK_ANCHOR_SIMILARITY_THRESHOLD) {
    yield lineSpan(content, originalLines, best.startLine, best.endLine);
  }
};
var WhitespaceNormalizedReplacer = function* (content, find) {
  const normalizeWhitespace = (text) => text.replace(/\s+/g, " ").trim();
  const normalizedFind = normalizeWhitespace(find);
  const lines = content.split(`
`);
  for (const line of lines) {
    const normalizedLine = normalizeWhitespace(line);
    if (normalizedLine === normalizedFind) {
      yield line;
    } else if (normalizedLine.includes(normalizedFind)) {
      const words = find.trim().split(/\s+/);
      if (words.length > 0) {
        const pattern = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
        try {
          const match = line.match(new RegExp(pattern));
          if (match) {
            yield match[0];
          }
        } catch {}
      }
    }
  }
  const findLines = find.split(`
`);
  if (findLines.length > 1) {
    for (let i = 0;i <= lines.length - findLines.length; i++) {
      const block = lines.slice(i, i + findLines.length);
      if (normalizeWhitespace(block.join(`
`)) === normalizedFind) {
        yield block.join(`
`);
      }
    }
  }
};
var IndentationFlexibleReplacer = function* (content, find) {
  const removeIndentation = (text) => {
    const textLines = text.split(`
`);
    const nonEmptyLines = textLines.filter((line) => line.trim().length > 0);
    if (nonEmptyLines.length === 0)
      return text;
    const minIndent = Math.min(...nonEmptyLines.map((line) => /^(\s*)/.exec(line)?.[1]?.length ?? 0));
    return textLines.map((line) => line.trim().length === 0 ? line : line.slice(minIndent)).join(`
`);
  };
  const normalizedFind = removeIndentation(find);
  const contentLines = content.split(`
`);
  const findLines = find.split(`
`);
  for (let i = 0;i <= contentLines.length - findLines.length; i++) {
    const block = contentLines.slice(i, i + findLines.length).join(`
`);
    if (removeIndentation(block) === normalizedFind) {
      yield block;
    }
  }
};
var EscapeNormalizedReplacer = function* (content, find) {
  const unescapeString = (str) => str.replace(/\\(n|t|r|'|"|`|\\|\n|\$)/g, (match, capturedChar) => {
    switch (capturedChar) {
      case "n":
        return `
`;
      case "t":
        return "\t";
      case "r":
        return "\r";
      case "'":
        return "'";
      case '"':
        return '"';
      case "`":
        return "`";
      case "\\":
        return "\\";
      case `
`:
        return `
`;
      case "$":
        return "$";
      default:
        return match;
    }
  });
  const unescapedFind = unescapeString(find);
  if (content.includes(unescapedFind)) {
    yield unescapedFind;
  }
  const lines = content.split(`
`);
  const findLines = unescapedFind.split(`
`);
  for (let i = 0;i <= lines.length - findLines.length; i++) {
    const block = lines.slice(i, i + findLines.length).join(`
`);
    if (unescapeString(block) === unescapedFind) {
      yield block;
    }
  }
};
var TrimmedBoundaryReplacer = function* (content, find) {
  const trimmedFind = find.trim();
  if (trimmedFind === find) {
    return;
  }
  if (content.includes(trimmedFind)) {
    yield trimmedFind;
  }
  const lines = content.split(`
`);
  const findLines = find.split(`
`);
  for (let i = 0;i <= lines.length - findLines.length; i++) {
    const block = lines.slice(i, i + findLines.length).join(`
`);
    if (block.trim() === trimmedFind) {
      yield block;
    }
  }
};
var ContextAwareReplacer = function* (content, find) {
  const findLines = find.split(`
`);
  if (findLines.length < 3) {
    return;
  }
  if (findLines[findLines.length - 1] === "") {
    findLines.pop();
  }
  const contentLines = content.split(`
`);
  const firstLine = (findLines[0] ?? "").trim();
  const lastLine = (findLines[findLines.length - 1] ?? "").trim();
  for (const [i, line] of contentLines.entries()) {
    if (line.trim() !== firstLine)
      continue;
    for (let j = i + 2;j < contentLines.length; j++) {
      if ((contentLines[j] ?? "").trim() === lastLine) {
        const blockLines = contentLines.slice(i, j + 1);
        if (blockLines.length === findLines.length) {
          let matchingLines = 0;
          let totalNonEmptyLines = 0;
          for (let k = 1;k < blockLines.length - 1; k++) {
            const blockLine = (blockLines[k] ?? "").trim();
            const findLine = (findLines[k] ?? "").trim();
            if (blockLine.length > 0 || findLine.length > 0) {
              totalNonEmptyLines++;
              if (blockLine === findLine) {
                matchingLines++;
              }
            }
          }
          if (totalNonEmptyLines === 0 || matchingLines / totalNonEmptyLines >= 0.5) {
            yield blockLines.join(`
`);
            break;
          }
        }
        break;
      }
    }
  }
};
var MultiOccurrenceReplacer = function* (content, find) {
  let startIndex = 0;
  while (true) {
    const index = content.indexOf(find, startIndex);
    if (index === -1)
      break;
    yield find;
    startIndex = index + find.length;
  }
};
var REPLACERS = [
  ["simple", SimpleReplacer],
  ["line_trimmed", LineTrimmedReplacer],
  ["block_anchor", BlockAnchorReplacer],
  ["whitespace_normalized", WhitespaceNormalizedReplacer],
  ["indentation_flexible", IndentationFlexibleReplacer],
  ["escape_normalized", EscapeNormalizedReplacer],
  ["trimmed_boundary", TrimmedBoundaryReplacer],
  ["context_aware", ContextAwareReplacer],
  ["multi_occurrence", MultiOccurrenceReplacer]
];
function isDisproportionateMatch(search, oldString) {
  const oldLines = oldString.split(`
`).length;
  const searchLines = search.split(`
`).length;
  if (searchLines >= Math.max(oldLines + 3, oldLines * 2))
    return true;
  if (oldLines === 1)
    return false;
  return search.trim().length > Math.max(oldString.trim().length + 500, oldString.trim().length * 4);
}
function replaceForgiving(content, oldString, newString, replaceAll = false) {
  if (oldString === newString) {
    throw new Error("No changes to apply: old_string and new_string are identical.");
  }
  if (oldString === "") {
    throw new Error("old_string cannot be empty. Provide the exact text to replace, or use write to replace a whole file.");
  }
  let notFound = true;
  for (const [strategy, replacer] of REPLACERS) {
    for (const search of replacer(content, oldString)) {
      if (search === "")
        continue;
      const index = content.indexOf(search);
      if (index === -1)
        continue;
      notFound = false;
      if (isDisproportionateMatch(search, oldString)) {
        throw new EditDisproportionateError;
      }
      if (replaceAll) {
        const parts = content.split(search);
        return { content: parts.join(newString), matched: strategy, replacements: parts.length - 1 };
      }
      const lastIndex = content.lastIndexOf(search);
      if (index !== lastIndex)
        continue;
      return {
        content: content.substring(0, index) + newString + content.substring(index + search.length),
        matched: strategy,
        replacements: 1
      };
    }
  }
  if (notFound) {
    throw new EditNotFoundError;
  }
  throw new EditNotUniqueError;
}
var EDIT_HINT_SIMILARITY = 0.6;
var EDIT_HINT_CONTEXT_LINES = 2;
var EDIT_HINT_MAX_LINES = 20;
var EDIT_HINT_MIN_REVERSE_LINE = 5;
var EDIT_HINT_MAX_LINE = 500;
function editNotFoundHint(content, oldString) {
  const anchor = oldString.split(`
`).map((line) => line.trim()).find((line) => line.length > 0);
  if (anchor === undefined)
    return null;
  const lines = content.split(`
`);
  let matchIndex = -1;
  for (const [i, line] of lines.entries()) {
    if (line.length > EDIT_HINT_MAX_LINE)
      continue;
    const trimmed = line.trim();
    if (trimmed.length === 0)
      continue;
    if (line.includes(anchor) || trimmed.length >= EDIT_HINT_MIN_REVERSE_LINE && anchor.includes(trimmed)) {
      matchIndex = i;
      break;
    }
  }
  if (matchIndex === -1) {
    let bestSimilarity = 0;
    for (const [i, line] of lines.entries()) {
      if (line.length > EDIT_HINT_MAX_LINE)
        continue;
      const trimmed = line.trim();
      if (trimmed.length === 0)
        continue;
      const maxLen = Math.max(trimmed.length, anchor.length);
      if (Math.min(trimmed.length, anchor.length) / maxLen < EDIT_HINT_SIMILARITY)
        continue;
      const similarity = 1 - levenshtein(trimmed, anchor) / maxLen;
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        matchIndex = i;
      }
    }
    if (matchIndex === -1 || bestSimilarity < EDIT_HINT_SIMILARITY)
      return null;
  }
  const oldLineCount = oldString.split(`
`).length;
  const start = Math.max(0, matchIndex - EDIT_HINT_CONTEXT_LINES);
  const end = Math.min(lines.length, Math.min(matchIndex + oldLineCount + EDIT_HINT_CONTEXT_LINES, start + EDIT_HINT_MAX_LINES));
  const preview = lines.slice(start, end).map((line, offset) => `${String(start + offset + 1).padStart(6)}|${line}`).join(`
`);
  return { line: matchIndex + 1, preview };
}
var BOM = "\uFEFF";
function splitBom(text) {
  return text.startsWith(BOM) ? { bom: true, text: text.slice(1) } : { bom: false, text };
}
function joinBom(text, bom) {
  const stripped = splitBom(text).text;
  return bom ? BOM + stripped : stripped;
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/path-locks.ts
var LOCKS_KEY = Symbol.for("zocomputer.agent-sdk.path-locks");
function lockChains() {
  const holder = globalThis;
  holder[LOCKS_KEY] ??= new Map;
  return holder[LOCKS_KEY];
}
async function withPathLock(path, fn) {
  const chains = lockChains();
  const prev = chains.get(path) ?? Promise.resolve();
  let release;
  const gate = new Promise((resolve2) => {
    release = resolve2;
  });
  const chained = prev.then(() => gate);
  chains.set(path, chained);
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (chains.get(path) === chained)
      chains.delete(path);
  }
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/workspace-io.ts
import { mkdirSync as mkdirSync2, readFileSync as readFileSync6, statSync as statSync2, writeFileSync as writeFileSync2 } from "node:fs";
import { dirname as dirname2, join as join3 } from "node:path";

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/glob-match.ts
function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const body = escaped.replace(/\*\*\/?/g, "\x00").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]").replace(/\u0000/g, "(?:.*/)?");
  return new RegExp(`^${body}$`);
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/list-files.ts
import { spawnSync } from "node:child_process";
var MAX_BUFFER = 64 * 1024 * 1024;
function gitPaths(root, args) {
  const res = spawnSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: MAX_BUFFER });
  if (res.error || res.status !== 0)
    return null;
  return res.stdout.split("\x00").filter((path) => path.length > 0);
}
function listGitFiles(root, scope) {
  const spec = scope !== undefined && scope !== "." ? ["--", scope] : [];
  const files = gitPaths(root, [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
    ...spec
  ]);
  if (files === null)
    return null;
  const deleted = gitPaths(root, ["ls-files", "--deleted", "-z", ...spec]);
  if (deleted === null || deleted.length === 0)
    return files;
  const gone = new Set(deleted);
  return files.filter((path) => !gone.has(path));
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/read-text.ts
import { readFileSync as readFileSync4, statSync } from "node:fs";
var MAX_SEARCH_FILE_BYTES = 1500000;
var BINARY_SNIFF_BYTES = 8192;
function readTextForSearch(abs, maxBytes = MAX_SEARCH_FILE_BYTES) {
  let size;
  try {
    const stats = statSync(abs);
    if (!stats.isFile())
      return { kind: "unreadable" };
    size = stats.size;
  } catch {
    return { kind: "unreadable" };
  }
  if (size > maxBytes)
    return { kind: "too-large", bytes: size };
  let buf;
  try {
    buf = readFileSync4(abs);
  } catch {
    return { kind: "unreadable" };
  }
  if (buf.subarray(0, BINARY_SNIFF_BYTES).includes(0))
    return { kind: "binary" };
  return { kind: "text", content: buf.toString("utf8") };
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/walk.ts
import { readFileSync as readFileSync5, readdirSync } from "node:fs";
import { join as join2, relative, sep } from "node:path";
import ignore from "ignore";
var ALWAYS_IGNORED = new Set([".git", ".jj", ".hg", ".svn", "node_modules"]);
function loadGitignore(absDir, prefix) {
  let text;
  try {
    text = readFileSync5(join2(absDir, ".gitignore"), "utf8");
  } catch {
    return null;
  }
  return { prefix, matcher: ignore().add(text) };
}
function isIgnored(scopes, relPath, isDir) {
  let ignored = false;
  for (const scope of scopes) {
    let sub;
    if (scope.prefix === "")
      sub = relPath;
    else if (relPath.startsWith(`${scope.prefix}/`))
      sub = relPath.slice(scope.prefix.length + 1);
    else
      continue;
    const verdict = scope.matcher.test(isDir ? `${sub}/` : sub);
    if (verdict.ignored)
      ignored = true;
    else if (verdict.unignored)
      ignored = false;
  }
  return ignored;
}
function* walkFiles(root, base = root) {
  const scopes = [];
  const relRoot = relative(base, root).split(sep).join("/");
  if (relRoot !== "" && !relRoot.startsWith("..")) {
    let absDir = base;
    let prefix = "";
    const own = loadGitignore(base, "");
    if (own !== null)
      scopes.push(own);
    const segments = relRoot.split("/");
    for (const segment of segments.slice(0, -1)) {
      absDir = join2(absDir, segment);
      prefix = prefix === "" ? segment : `${prefix}/${segment}`;
      const scope = loadGitignore(absDir, prefix);
      if (scope !== null)
        scopes.push(scope);
    }
  }
  const stack = [{ dir: root, rel: relRoot === "." ? "" : relRoot, scopes }];
  while (stack.length > 0) {
    const frame = stack.pop();
    if (frame === undefined)
      break;
    let entries;
    try {
      entries = readdirSync(frame.dir, { withFileTypes: true });
    } catch {
      continue;
    }
    const own = loadGitignore(frame.dir, frame.rel);
    const active = own === null ? frame.scopes : [...frame.scopes, own];
    for (const entry of entries) {
      const rel = frame.rel === "" ? entry.name : `${frame.rel}/${entry.name}`;
      if (entry.isDirectory()) {
        if (ALWAYS_IGNORED.has(entry.name))
          continue;
        if (isIgnored(active, rel, true))
          continue;
        stack.push({ dir: join2(frame.dir, entry.name), rel, scopes: active });
      } else if (entry.isFile()) {
        if (entry.name === ".git")
          continue;
        if (isIgnored(active, rel, false))
          continue;
        yield rel;
      }
    }
  }
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/workspace.ts
import { isAbsolute, relative as relative2, resolve as resolve2, sep as sep2 } from "node:path";
function resolveWithin(root, path) {
  const abs = isAbsolute(path) ? resolve2(path) : resolve2(root, path);
  if (abs !== root && !abs.startsWith(root + sep2)) {
    throw new Error(`Path escapes the workspace root (${root}): ${path}. File tools only reach inside the workspace — use a root-relative path, or bash for anything outside it.`);
  }
  return abs;
}
function relativizeWithin(root, abs) {
  const rel = relative2(root, abs);
  return rel === "" ? "." : rel.split(sep2).join("/");
}
function createWorkspace(root) {
  const abs = resolve2(root);
  return {
    root: abs,
    resolve: (path) => resolveWithin(abs, path),
    relativize: (path) => relativizeWithin(abs, path)
  };
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/workspace-io.ts
function createLocalIo(root, abortSignal) {
  return {
    async stat(abs) {
      throwIfAborted(abortSignal);
      let st;
      try {
        st = statSync2(abs);
      } catch {
        return null;
      }
      throwIfAborted(abortSignal);
      return { isFile: st.isFile(), size: st.size, mtimeMs: st.mtimeMs };
    },
    async readFile(abs) {
      throwIfAborted(abortSignal);
      try {
        const content = readFileSync6(abs);
        throwIfAborted(abortSignal);
        return content;
      } catch (err) {
        if (isMissingFileError(err))
          return null;
        throw err;
      }
    },
    async writeFile(abs, content) {
      throwIfAborted(abortSignal);
      mkdirSync2(dirname2(abs), { recursive: true });
      writeFileSync2(abs, content);
      await cancellationCheckpoint(abortSignal);
    },
    async listFiles(scope) {
      await cancellationCheckpoint(abortSignal);
      if (scope === undefined) {
        const files2 = listGitFiles(root) ?? walkFiles(root);
        await cancellationCheckpoint(abortSignal);
        return files2;
      }
      const rel = relativizeWithin(root, scope);
      const files = listGitFiles(root, rel) ?? walkFiles(scope, root);
      await cancellationCheckpoint(abortSignal);
      return files;
    },
    async search(options) {
      return searchLocal(root, options, abortSignal);
    }
  };
}
function localIoProvider(root) {
  const io = createLocalIo(root);
  return (ctx) => ctx === undefined ? io : createLocalIo(root, ctx.abortSignal);
}
function throwIfAborted(signal) {
  if (signal?.aborted !== true)
    return;
  if (signal.reason instanceof Error)
    throw signal.reason;
  throw new DOMException("The tool call was cancelled", "AbortError");
}
async function cancellationCheckpoint(signal) {
  throwIfAborted(signal);
  if (signal === undefined)
    return;
  await new Promise((resolve3) => setImmediate(resolve3));
  throwIfAborted(signal);
}
function isMissingFileError(err) {
  return typeof err === "object" && err !== null && "code" in err && err.code === "ENOENT";
}
async function searchLocal(root, options, abortSignal) {
  await cancellationCheckpoint(abortSignal);
  const re = new RegExp(options.pattern, options.ignoreCase ? "i" : "");
  const globRe = options.glob ? globToRegExp(options.glob) : null;
  let candidates;
  if (options.scope !== undefined) {
    const rel = relativizeWithin(root, options.scope);
    let isFile = false;
    try {
      isFile = statSync2(options.scope).isFile();
    } catch {
      isFile = false;
    }
    candidates = isFile ? [rel] : listGitFiles(root, rel) ?? walkFiles(options.scope, root);
  } else {
    candidates = listGitFiles(root) ?? walkFiles(root);
  }
  const matches = [];
  let stopped = false;
  let skippedLargeFiles = 0;
  let scannedLines = 0;
  scan:
    for (const file of candidates) {
      throwIfAborted(abortSignal);
      if (globRe && !globRe.test(file))
        continue;
      const read = readTextForSearch(join3(root, file));
      if (read.kind === "too-large") {
        skippedLargeFiles += 1;
        continue;
      }
      if (read.kind !== "text")
        continue;
      const lines = read.content.split(`
`);
      for (const [index, line] of lines.entries()) {
        throwIfAborted(abortSignal);
        scannedLines += 1;
        if (scannedLines % 2048 === 0) {
          await cancellationCheckpoint(abortSignal);
        }
        if (!re.test(line))
          continue;
        matches.push({ file, line: index + 1, text: line });
        if (matches.length >= options.maxMatches) {
          stopped = "max-matches";
          break scan;
        }
      }
    }
  return { matches, stopped, skippedLargeFiles };
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/tools/edit.ts
function createEditTool(opts) {
  const { workspace, noun } = opts;
  const io = opts.io ?? localIoProvider(workspace.root);
  return defineTool2({
    description: "Replace a string in an existing file. Prefer the exact text from a read; near-miss whitespace, indentation, and over-escaping are tolerated, but a match much larger than old_string is refused. By default old_string must resolve to exactly one place — include enough surrounding context to make it unique. Set replace_all to replace every occurrence (e.g. renaming a symbol).",
    inputSchema: z3.object({
      path: z3.string().min(1).describe(`File path, relative to the ${noun} root.`),
      old_string: z3.string().min(1).describe("Exact text to replace; must currently exist in the file."),
      new_string: z3.string().describe("Text to replace it with."),
      replace_all: z3.boolean().optional().describe("Replace every occurrence instead of requiring a single match.")
    }),
    async execute({ path, old_string, new_string, replace_all }, ctx) {
      const abs = workspace.resolve(path);
      const rel = workspace.relativize(abs);
      const fio = io(ctx);
      return withPathLock(abs, async () => {
        const stat = await fio.stat(abs);
        if (stat === null)
          throw new Error(`${rel} does not exist.`);
        if (!stat.isFile) {
          throw new Error(`${rel} is a directory, not a file — nothing was edited. Give the path of a file inside it instead.`);
        }
        const bytes = await fio.readFile(abs);
        if (bytes === null)
          throw new Error(`${rel} does not exist.`);
        const { bom, text: before } = splitBom(bytes.toString("utf8"));
        let result;
        try {
          result = replaceForgiving(before, old_string, new_string, replace_all ?? false);
        } catch (error) {
          if (error instanceof EditNotFoundError) {
            const hint = editNotFoundHint(before, old_string);
            const didYouMean = hint === null ? "" : `

Closest match, around line ${hint.line}:
${hint.preview}`;
            throw new Error(`old_string not found in ${rel}. It must match the file contents — re-read the file and copy the exact text, including whitespace and indentation.${didYouMean}`);
          }
          if (error instanceof EditNotUniqueError) {
            throw new Error(`old_string is not unique in ${rel}. Add surrounding context to make the match unique, or set replace_all.`);
          }
          if (error instanceof EditDisproportionateError) {
            throw new Error(`Refusing the edit in ${rel}: the closest match is much larger than old_string. Re-read the file and provide the full exact old_string.`);
          }
          throw error;
        }
        await fio.writeFile(abs, joinBom(result.content, bom));
        return { ok: true, path: rel, replacements: result.replacements, matched: result.matched };
      });
    }
  });
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/tools/glob.ts
import { defineTool as defineTool3 } from "eve/tools";
import { z as z4 } from "zod";
function createGlobTool(opts) {
  const { workspace, noun } = opts;
  const io = opts.io ?? localIoProvider(workspace.root);
  return defineTool3({
    description: `Find files in the ${noun} by glob pattern, returning ${noun}-relative paths. \`**\` spans directories, \`*\` matches within a path segment. A pattern without a leading \`**/\` is matched at any depth (so \`*.ts\` finds .ts files anywhere). Gitignored files and build/VCS dirs are skipped.`,
    inputSchema: z4.object({
      pattern: z4.string().min(1).describe("Glob pattern, e.g. `**/*.ts` or `src/tools/*.ts`."),
      limit: z4.number().int().positive().optional().describe("Max paths to return (default 500).")
    }),
    async execute({ pattern, limit }, ctx) {
      const normalized = pattern.startsWith("**/") || pattern.startsWith("/") ? pattern.replace(/^\//, "") : `**/${pattern}`;
      const re = globToRegExp(normalized);
      const max = limit ?? 500;
      const candidates = await io(ctx).listFiles();
      const files = [];
      let truncated = false;
      for (const file of candidates) {
        if (re.test(file)) {
          if (files.length >= max) {
            truncated = true;
            break;
          }
          files.push(file);
        }
      }
      return {
        pattern,
        count: files.length,
        truncated,
        files,
        ...truncated ? { note: `More matches exist beyond the first ${max}. Use a more specific pattern, or raise limit.` } : {}
      };
    }
  });
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/tools/grep.ts
import { defineTool as defineTool4 } from "eve/tools";
import { z as z5 } from "zod";
import { join as join4 } from "node:path";
var GREP_SPILL_MAX_MATCHES = 5000;
var MATCH_TEXT_MAX_CHARS = 300;
function createGrepTool(opts) {
  const { workspace, noun, spillDir } = opts;
  const io = opts.io ?? localIoProvider(workspace.root);
  return defineTool4({
    description: `Search ${noun} file contents by regular expression, returning matching lines with their file and line number. Scope with \`path\` (a file or directory) and/or a \`glob\` on the filename. Gitignored files, build/VCS dirs, binaries, and files over ~1.5 MB are skipped.${spillDir === undefined ? "" : " When more lines match than max_results, the collected matches are saved to a file named in the result (the note says whether that list is complete) — read or grep that file instead of re-searching."}`,
    inputSchema: z5.object({
      pattern: z5.string().min(1).describe("JavaScript regular expression to search for."),
      path: z5.string().optional().describe(`A file or directory (relative to the ${noun} root) to limit the search to.`),
      glob: z5.string().optional().describe("Only search files whose path matches this glob, e.g. `**/*.ts`."),
      ignore_case: z5.boolean().optional().describe("Case-insensitive match."),
      max_results: z5.number().int().positive().optional().describe("Max matching lines (default 200).")
    }),
    async execute({ pattern, path, glob, ignore_case, max_results }, ctx) {
      try {
        new RegExp(pattern, ignore_case ? "i" : "");
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        throw new Error(`Invalid regular expression: ${reason}`);
      }
      const max = max_results ?? 200;
      const fio = io(ctx);
      let scope;
      if (path) {
        const abs = workspace.resolve(path);
        const stat = await fio.stat(abs);
        if (stat === null) {
          throw new Error(`${workspace.relativize(abs)} does not exist.`);
        }
        scope = abs;
      }
      const cap = spillDir === undefined ? Math.min(max + 1, GREP_SPILL_MAX_MATCHES) : GREP_SPILL_MAX_MATCHES;
      const searched = await fio.search({
        pattern,
        ignoreCase: ignore_case ?? false,
        scope,
        glob,
        maxMatches: cap
      });
      const clip = (m) => ({
        file: m.file,
        line: m.line,
        text: m.text.slice(0, MATCH_TEXT_MAX_CHARS)
      });
      const matches = searched.matches.slice(0, max).map(clip);
      const skipped = searched.skippedLargeFiles === null ? {} : { skippedLargeFiles: searched.skippedLargeFiles };
      const hitHardBound = searched.stopped === "max-matches" && cap === GREP_SPILL_MAX_MATCHES;
      const floodCut = searched.stopped === "output-cap";
      if (searched.stopped === false && searched.matches.length <= max) {
        return { pattern, count: matches.length, truncated: false, ...skipped, matches };
      }
      if (spillDir === undefined && !hitHardBound && !floodCut) {
        return {
          pattern,
          count: matches.length,
          truncated: true,
          ...skipped,
          matches,
          note: `Stopped at ${max} matching lines — more matches may exist. Narrow with path/glob or a more specific pattern, or raise max_results.`
        };
      }
      const allLines = searched.matches.map((m) => `${m.file}:${m.line}: ${m.text.slice(0, MATCH_TEXT_MAX_CHARS)}`);
      let label = null;
      if (spillDir !== undefined) {
        const spillPath = join4(spillDir, `grep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.txt`);
        try {
          await fio.writeFile(spillPath, allLines.join(`
`) + `
`);
          label = workspace.relativize(spillPath);
        } catch {}
      }
      const found = floodCut ? `Search output hit the transfer cap after ${allLines.length} matching lines — more matches may exist` : hitHardBound ? `Stopped scanning at ${GREP_SPILL_MAX_MATCHES} matching lines` : `Found ${allLines.length} matching lines`;
      const spillIsComplete = !floodCut && !hitHardBound;
      const where = label === null ? "Narrow with path/glob or a more specific pattern, or raise max_results." : `The ${spillIsComplete ? "complete list is" : "matches collected so far are"} at ${label} — read or grep that file, or narrow with path/glob.`;
      return {
        pattern,
        count: matches.length,
        totalMatches: allLines.length,
        truncated: true,
        ...skipped,
        matches,
        note: `${found} — showing the first ${matches.length} here. ${where}`
      };
    }
  });
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/tools/look.ts
import { defineTool as defineTool5 } from "eve/tools";
import { basename } from "node:path";
import { z as z6 } from "zod";

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/file-kind.ts
import { extname } from "node:path";
function imageMediaType(format) {
  return `image/${format}`;
}
function videoMediaType(format) {
  switch (format) {
    case "mp4":
      return "video/mp4";
    case "mov":
      return "video/quicktime";
    case "webm":
      return "video/webm";
    case "mkv":
      return "video/x-matroska";
    case "avi":
      return "video/x-msvideo";
  }
}
function audioMediaType(format) {
  switch (format) {
    case "mp3":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    case "ogg":
      return "audio/ogg";
    case "flac":
      return "audio/flac";
    case "m4a":
      return "audio/mp4";
  }
}
var BINARY_SNIFF_BYTES2 = 8192;
function startsWith(buf, bytes, at = 0) {
  if (buf.length < at + bytes.length)
    return false;
  for (const [i, b] of bytes.entries())
    if (buf[at + i] !== b)
      return false;
  return true;
}
var PDF_MAGIC = [37, 80, 68, 70, 45];
var PNG_MAGIC = [137, 80, 78, 71, 13, 10, 26, 10];
var JPEG_MAGIC = [255, 216, 255];
var GIF_MAGIC = [71, 73, 70, 56];
var RIFF_MAGIC = [82, 73, 70, 70];
var WEBP_TAG = [87, 69, 66, 80];
var AVI_TAG = [65, 86, 73, 32];
var WAVE_TAG = [87, 65, 86, 69];
var FTYP_TAG = [102, 116, 121, 112];
var EBML_MAGIC = [26, 69, 223, 163];
var ID3_MAGIC = [73, 68, 51];
var OGG_MAGIC = [79, 103, 103, 83];
var FLAC_MAGIC = [102, 76, 97, 67];
var ZIP_MAGIC = [80, 75, 3, 4];
var CFB_MAGIC = [208, 207, 17, 224, 161, 177, 26, 225];
var RTF_MAGIC = [123, 92, 114, 116, 102];
var UTF16LE_BOM = [255, 254];
var UTF16BE_BOM = [254, 255];
var BMFF_IMAGE_BRANDS = new Set([
  "avif",
  "avis",
  "heic",
  "heix",
  "heim",
  "heis",
  "hevc",
  "hevx",
  "mif1",
  "msf1"
]);
var BMFF_AUDIO_BRANDS = new Set(["M4A ", "M4B ", "M4P "]);
var BMFF_AUDIO_EXTENSIONS = new Set([".m4a", ".m4b", ".m4p"]);
var BMFF_FTYP_SCAN_CAP = 256;
function bmffBrands(buf) {
  const boxSize = buf.length >= 4 ? buf.readUInt32BE(0) : 0;
  const end = Math.min(boxSize, buf.length, BMFF_FTYP_SCAN_CAP);
  const brands = [buf.subarray(8, 12).toString("latin1")];
  for (let off = 16;off + 4 <= end; off += 4) {
    brands.push(buf.subarray(off, off + 4).toString("latin1"));
  }
  return brands;
}
function bmffKind(buf, path) {
  const brands = bmffBrands(buf);
  const major = brands[0] ?? "";
  const imageBrand = brands.find((brand) => BMFF_IMAGE_BRANDS.has(brand.toLowerCase()));
  if (imageBrand !== undefined) {
    return {
      kind: "binary",
      description: `an HEIF/AVIF image (brand "${imageBrand.trim()}") with no supported renderer — convert it to PNG or JPEG`
    };
  }
  if (brands.some((brand) => BMFF_AUDIO_BRANDS.has(brand))) {
    return { kind: "audio", format: "m4a" };
  }
  if (major.startsWith("qt"))
    return { kind: "video", format: "mov" };
  if (BMFF_AUDIO_EXTENSIONS.has(extname(path).toLowerCase())) {
    return { kind: "audio", format: "m4a" };
  }
  return { kind: "video", format: "mp4" };
}
function ebmlKind(buf) {
  const header = buf.subarray(0, 64).toString("latin1");
  if (header.includes("webm"))
    return { kind: "video", format: "webm" };
  return { kind: "video", format: "mkv" };
}
function zipKind(path) {
  switch (extname(path).toLowerCase()) {
    case ".docx":
      return { kind: "docx" };
    case ".xlsx":
      return { kind: "sheet", format: "xlsx" };
    case ".xlsm":
      return { kind: "sheet", format: "xlsm" };
    case ".ods":
      return { kind: "sheet", format: "ods" };
    case ".pptx":
      return { kind: "pptx" };
    case ".odt":
      return { kind: "odt" };
    case ".odp":
      return { kind: "odp" };
    case ".epub":
      return { kind: "epub" };
    default:
      return { kind: "binary", description: "a zip archive" };
  }
}
function cfbKind(path) {
  switch (extname(path).toLowerCase()) {
    case ".xls":
      return { kind: "sheet", format: "xls" };
    case ".doc":
      return {
        kind: "binary",
        description: "a legacy Word document (.doc) with no text extractor — convert it to .docx"
      };
    case ".ppt":
      return {
        kind: "binary",
        description: "a legacy PowerPoint deck (.ppt) with no text extractor — convert it to .pptx"
      };
    default:
      return { kind: "binary", description: "a legacy Office (CFB) container" };
  }
}
function detectFileKind(buf, path) {
  if (startsWith(buf, PDF_MAGIC))
    return { kind: "pdf" };
  if (startsWith(buf, PNG_MAGIC))
    return { kind: "image", format: "png" };
  if (startsWith(buf, JPEG_MAGIC))
    return { kind: "image", format: "jpeg" };
  if (startsWith(buf, GIF_MAGIC))
    return { kind: "image", format: "gif" };
  if (startsWith(buf, RIFF_MAGIC)) {
    if (startsWith(buf, WEBP_TAG, 8))
      return { kind: "image", format: "webp" };
    if (startsWith(buf, AVI_TAG, 8))
      return { kind: "video", format: "avi" };
    if (startsWith(buf, WAVE_TAG, 8))
      return { kind: "audio", format: "wav" };
  }
  if (startsWith(buf, FTYP_TAG, 4))
    return bmffKind(buf, path);
  if (startsWith(buf, EBML_MAGIC))
    return ebmlKind(buf);
  if (startsWith(buf, OGG_MAGIC))
    return { kind: "audio", format: "ogg" };
  if (startsWith(buf, FLAC_MAGIC))
    return { kind: "audio", format: "flac" };
  if (startsWith(buf, ID3_MAGIC))
    return { kind: "audio", format: "mp3" };
  if (buf.length >= 2 && buf[0] === 255 && ((buf[1] ?? 0) & 224) === 224 && extname(path).toLowerCase() === ".mp3") {
    return { kind: "audio", format: "mp3" };
  }
  if (startsWith(buf, ZIP_MAGIC))
    return zipKind(path);
  if (startsWith(buf, CFB_MAGIC))
    return cfbKind(path);
  if (startsWith(buf, RTF_MAGIC))
    return { kind: "rtf" };
  if (startsWith(buf, UTF16LE_BOM))
    return { kind: "text", encoding: "utf16le" };
  if (startsWith(buf, UTF16BE_BOM))
    return { kind: "text", encoding: "utf16be" };
  if (buf.subarray(0, BINARY_SNIFF_BYTES2).includes(0)) {
    return { kind: "binary", description: "binary data (unrecognized format)" };
  }
  if (extname(path).toLowerCase() === ".ipynb")
    return { kind: "ipynb" };
  return { kind: "text", encoding: "utf8" };
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/tools/look.ts
var DEFAULT_LOOK_MAX_INPUT_BYTES = 20 * 1024 * 1024;
var DEFAULT_LOOK_TIMEOUT_MS = 180000;
var LOOK_MAX_ANSWER_CHARS = 30000;
var DEFAULT_MEDIA_ORACLE = {
  model: "google/gemini-3-flash",
  modelName: "Gemini 3 Flash",
  capabilities: { image: true, pdf: true, video: true, audio: true }
};
function resolveMediaOracle(option) {
  return option === true ? DEFAULT_MEDIA_ORACLE : option;
}
var AI_MODULE_SPECIFIER = "ai";
var defaultGenerate = async (options) => {
  const { generateText } = await import(AI_MODULE_SPECIFIER);
  return generateText({
    model: options.model,
    messages: options.messages,
    timeout: options.timeoutMs,
    ...options.abortSignal !== undefined ? { abortSignal: options.abortSignal } : {},
    ...options.headers !== undefined ? { headers: options.headers } : {}
  });
};
var KIND_LABELS = {
  image: "image",
  pdf: "PDF",
  video: "video",
  audio: "audio"
};
function createLookTool(opts) {
  const { workspace, oracle } = opts;
  const noun = opts.noun ?? "workspace";
  const io = opts.io ?? localIoProvider(workspace.root);
  const maxInputBytes = opts.maxInputBytes ?? DEFAULT_LOOK_MAX_INPUT_BYTES;
  const generate = opts.generateFn ?? defaultGenerate;
  const capabilityPhrase = describeCapabilities(oracle.capabilities);
  return defineTool5({
    description: `Ask ${oracle.modelName} — a separate model that ${capabilityPhrase} — one question about a media file in the ${noun} that you cannot view yourself. Sends the file's bytes and your prompt in a single call and returns the model's answer as text. ` + `The model sees only the file and your prompt — none of your conversation — so pack the prompt with everything it needs and name the exact deliverable ` + `(e.g. "describe the UI layout and transcribe all visible text", "summarize what happens in this recording"). Text-readable files (source, PDFs-as-text, DOCX, spreadsheets) are cheaper through read; use look for pixels, video, and audio.`,
    inputSchema: z6.object({
      path: z6.string().min(1).describe(`Media file path, relative to the ${noun} root.`),
      prompt: z6.string().min(1).describe("The question or task for the model, self-contained.")
    }),
    async execute({ path, prompt }, ctx) {
      const abs = workspace.resolve(path);
      const rel = workspace.relativize(abs);
      const fio = io(ctx);
      const stat = await fio.stat(abs);
      if (stat === null)
        throw new Error(`${rel} does not exist.`);
      if (!stat.isFile) {
        throw new Error(`${rel} is not a regular file. Use glob to list a directory.`);
      }
      if (stat.size > maxInputBytes) {
        throw new Error(`${rel} is ${stat.size} bytes — too large to send to ${oracle.modelName} (max ${maxInputBytes}).`);
      }
      const buffer = await fio.readFile(abs);
      if (buffer === null)
        throw new Error(`${rel} does not exist.`);
      if (buffer.length > maxInputBytes) {
        throw new Error(`${rel} is ${buffer.length} bytes — too large to send to ${oracle.modelName} (max ${maxInputBytes}).`);
      }
      const kind = detectFileKind(buffer, rel);
      const media = mediaPartFor(kind, rel, oracle);
      const message = {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "file",
            data: buffer,
            mediaType: media.mediaType,
            filename: basename(rel)
          }
        ]
      };
      const result = await generate({
        model: oracle.model,
        messages: [message],
        timeoutMs: oracle.timeoutMs ?? DEFAULT_LOOK_TIMEOUT_MS,
        ...oracle.headers !== undefined ? { headers: oracle.headers } : {},
        ...ctx?.abortSignal !== undefined ? { abortSignal: ctx.abortSignal } : {}
      });
      return {
        path: rel,
        media_type: media.mediaType,
        model: oracle.modelName,
        answer: boundAnswer(result.text)
      };
    }
  });
}
function boundAnswer(text) {
  if (typeof text !== "string" || text.length === 0) {
    return "(the model returned no answer text)";
  }
  if (text.length <= LOOK_MAX_ANSWER_CHARS)
    return text;
  let cut = LOOK_MAX_ANSWER_CHARS;
  const beforeCut = text.charCodeAt(cut - 1);
  if (beforeCut >= 55296 && beforeCut <= 56319)
    cut -= 1;
  return `${text.slice(0, cut)}
… [answer truncated: showing first ${cut} of ${text.length} chars]`;
}
function mediaPartFor(kind, rel, oracle) {
  const refuseUnsupported = (label) => {
    if (!oracle.capabilities[label]) {
      const article = label === "audio" || label === "image" ? "an" : "a";
      throw new Error(`${rel} is ${article} ${KIND_LABELS[label]} file, which ${oracle.modelName} cannot view — it ${describeCapabilities(oracle.capabilities)}.`);
    }
  };
  switch (kind.kind) {
    case "image":
      refuseUnsupported("image");
      return { mediaType: imageMediaType(kind.format) };
    case "pdf":
      refuseUnsupported("pdf");
      return { mediaType: "application/pdf" };
    case "video":
      refuseUnsupported("video");
      return { mediaType: videoMediaType(kind.format) };
    case "audio":
      refuseUnsupported("audio");
      return { mediaType: audioMediaType(kind.format) };
    case "text":
      throw new Error(`${rel} is a text file — read it yourself with the read tool, or extract slices with bash (head, sed -n, rg) if it is too large to read.`);
    case "docx":
    case "sheet":
    case "pptx":
    case "odt":
    case "odp":
    case "epub":
    case "ipynb":
    case "rtf":
      throw new Error(`${rel} converts to text — read it yourself with the read tool.`);
    case "binary":
      throw new Error(`${rel} is ${kind.description} — look cannot send it to a model.`);
    default: {
      const exhausted = kind;
      throw new Error(`Unhandled file kind: ${JSON.stringify(exhausted)}`);
    }
  }
}
function lookReadImageHint(oracle) {
  if (!oracle.capabilities.image)
    return;
  return `Pass the path and a question to the look tool to have ${oracle.modelName} examine it for you.`;
}
function lookAvKindClause(caps) {
  if (caps.video && caps.audio)
    return "a video or audio file";
  if (caps.video)
    return "a video file";
  if (caps.audio)
    return "an audio file";
  return;
}
function lookReadMediaHint(oracle) {
  const clause = lookAvKindClause(oracle.capabilities);
  if (clause === undefined)
    return;
  return `If it is ${clause}, pass the path and a question to the look tool to have ${oracle.modelName} view it for you; otherwise extract what you can with bash (e.g. ffmpeg frames from a video, read as images).`;
}
function lookFetchedImageHint(oracle) {
  if (!oracle.capabilities.image)
    return;
  return `Download it (e.g. bash curl -o) and pass the saved path with a question to the look tool to have ${oracle.modelName} examine it for you.`;
}
function lookFetchedMediaHint(oracle) {
  const clause = lookAvKindClause(oracle.capabilities);
  if (clause === undefined)
    return;
  return `If it is ${clause}, download it (e.g. bash curl -o) and pass the saved path with a question to the look tool to have ${oracle.modelName} view it for you; otherwise extract what you can with bash (e.g. ffmpeg frames from a video, read as images).`;
}
function lookOversizeHint(oracle, maxInputBytes = DEFAULT_LOOK_MAX_INPUT_BYTES) {
  const caps = oracle.capabilities;
  const kinds = [
    ["image", "image"],
    ["pdf", "PDF"],
    ["video", "video"],
    ["audio", "audio"]
  ].filter(([key]) => caps[key]).map(([, label]) => label);
  const first = kinds[0];
  if (first === undefined)
    return;
  const kindList = kinds.length === 1 ? first : `${kinds.slice(0, -1).join(", ")}, or ${kinds[kinds.length - 1]}`;
  const article = first === "image" || first === "audio" ? "an" : "a";
  const capMb = Math.floor(maxInputBytes / 1048576);
  return `For text, use bash (head, sed -n, rg) to extract the part you need. Only if it is ${article} ${kindList} file up to ${capMb} MB, pass the path and a question to the look tool to have ${oracle.modelName} examine it (look sends files read cannot; over ${capMb} MB, shrink it first, e.g. ffmpeg extraction).`;
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/tools/read.ts
import { defineTool as defineTool6 } from "eve/tools";
import { z as z7 } from "zod";

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/file-view.ts
var READ_FILE_DEFAULT_LINE_LIMIT = 2000;
var READ_FILE_MAX_LINE_CHARS = 2000;
var READ_FILE_MAX_CONTENT_CHARS = 50000;
var READ_FILE_MAX_BYTES = 1e7;
function buildFileView(text, opts = {}) {
  const lines = text.split(`
`);
  const start = opts.offset ? opts.offset - 1 : 0;
  const requestedEnd = Math.min(start + (opts.limit ?? READ_FILE_DEFAULT_LINE_LIMIT), lines.length);
  const parts = [];
  let chars = 0;
  let included = 0;
  let clippedLine = false;
  let budgetStopped = false;
  for (let i = start;i < requestedEnd; i++) {
    const raw = lines[i];
    if (raw === undefined)
      break;
    const clipped = raw.length > READ_FILE_MAX_LINE_CHARS ? `${raw.slice(0, READ_FILE_MAX_LINE_CHARS)}… [line truncated]` : raw;
    if (clipped !== raw)
      clippedLine = true;
    const numbered = `${String(i + 1).padStart(6)}|${clipped}`;
    if (included > 0 && chars + numbered.length + 1 > READ_FILE_MAX_CONTENT_CHARS) {
      budgetStopped = true;
      break;
    }
    parts.push(numbered);
    chars += numbered.length + 1;
    included += 1;
  }
  const endLine = start + included;
  const note = included === 0 && start >= lines.length ? `Offset ${start + 1} is past the end of the file (${lines.length} lines).` : endLine < lines.length ? `Showing lines ${start + 1}–${endLine} of ${lines.length}${budgetStopped ? " (output budget reached)" : ""}. Continue with offset=${endLine + 1}, or use grep to locate what you need.` : null;
  return {
    totalLines: lines.length,
    startLine: start + 1,
    endLine,
    content: parts.join(`
`),
    truncated: budgetStopped || clippedLine,
    note
  };
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/read-file-content.ts
import { imageSize } from "image-size";

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/extract/cache.ts
function createStatCache(limit) {
  const entries = new Map;
  return {
    async get(key, id, compute) {
      const hit = entries.get(key);
      if (hit !== undefined && hit.id.mtimeMs === id.mtimeMs && hit.id.size === id.size) {
        entries.delete(key);
        entries.set(key, hit);
        return hit.value;
      }
      const value = await compute();
      entries.delete(key);
      entries.set(key, { id, value });
      if (entries.size > limit) {
        const oldest = entries.keys().next();
        if (!oldest.done)
          entries.delete(oldest.value);
      }
      return value;
    },
    size: () => entries.size
  };
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/extract/docx.ts
import mammoth from "mammoth";
async function extractDocx(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return { ok: true, text: result.value.replace(/\n+$/, `
`) };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/extract/epub.ts
import { Parser } from "htmlparser2";

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/extract/zip.ts
import { inflateRawSync } from "node:zlib";
var EOCD_SIGNATURE = 101010256;
var CENTRAL_SIGNATURE = 33639248;
var LOCAL_SIGNATURE = 67324752;
var EOCD_SCAN_LIMIT = 22 + 65535;
var METHOD_STORED = 0;
var METHOD_DEFLATE = 8;
function findEndOfCentralDirectory(buffer) {
  const stop = Math.max(0, buffer.length - EOCD_SCAN_LIMIT);
  for (let at = buffer.length - 22;at >= stop; at--) {
    if (buffer.readUInt32LE(at) !== EOCD_SIGNATURE)
      continue;
    const commentLength = buffer.readUInt16LE(at + 20);
    if (at + 22 + commentLength === buffer.length)
      return at;
  }
  throw new Error("not a readable zip archive (no end-of-central-directory record)");
}
function openZip(buffer) {
  if (buffer.length < 22) {
    throw new Error("not a readable zip archive (too small)");
  }
  const eocd = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(eocd + 10);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  const entries = new Map;
  const names = [];
  let at = centralOffset;
  for (let i = 0;i < entryCount; i++) {
    if (at + 46 > buffer.length || buffer.readUInt32LE(at) !== CENTRAL_SIGNATURE) {
      throw new Error("not a readable zip archive (corrupt central directory)");
    }
    const flags = buffer.readUInt16LE(at + 8);
    const method = buffer.readUInt16LE(at + 10);
    const compressedSize = buffer.readUInt32LE(at + 20);
    const nameLength = buffer.readUInt16LE(at + 28);
    const extraLength = buffer.readUInt16LE(at + 30);
    const commentLength = buffer.readUInt16LE(at + 32);
    const localHeaderOffset = buffer.readUInt32LE(at + 42);
    const name = buffer.subarray(at + 46, at + 46 + nameLength).toString("utf8");
    if (!name.endsWith("/")) {
      if (!entries.has(name))
        names.push(name);
      entries.set(name, {
        localHeaderOffset,
        compressedSize,
        method,
        encrypted: (flags & 1) !== 0
      });
    }
    at += 46 + nameLength + extraLength + commentLength;
  }
  return {
    names,
    has: (name) => entries.has(name),
    read(name) {
      const entry = entries.get(name);
      if (entry === undefined) {
        throw new Error(`zip archive has no entry named ${name}`);
      }
      if (entry.encrypted) {
        throw new Error(`zip entry ${name} is encrypted (password-protected archives are not supported)`);
      }
      const local = entry.localHeaderOffset;
      if (local + 30 > buffer.length || buffer.readUInt32LE(local) !== LOCAL_SIGNATURE) {
        throw new Error(`zip entry ${name} has a corrupt local header`);
      }
      const nameLength = buffer.readUInt16LE(local + 26);
      const extraLength = buffer.readUInt16LE(local + 28);
      const dataStart = local + 30 + nameLength + extraLength;
      const dataEnd = dataStart + entry.compressedSize;
      if (dataEnd > buffer.length) {
        throw new Error(`zip entry ${name} is truncated`);
      }
      const data = buffer.subarray(dataStart, dataEnd);
      switch (entry.method) {
        case METHOD_STORED:
          return Buffer.from(data);
        case METHOD_DEFLATE:
          return inflateRawSync(data);
        default:
          throw new Error(`zip entry ${name} uses unsupported compression method ${entry.method}`);
      }
    }
  };
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/extract/epub.ts
var EPUB_SECTION_CAP = 200;
var BLOCK_TAGS = new Set([
  "p",
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "tr",
  "br",
  "section",
  "article",
  "blockquote",
  "pre",
  "figcaption"
]);
function xhtmlToText(html) {
  let text = "";
  let skipDepth = 0;
  const parser = new Parser({
    onopentag(name) {
      if (name === "script" || name === "style" || name === "head")
        skipDepth++;
      else if (BLOCK_TAGS.has(name))
        text += `
`;
    },
    ontext(chunk) {
      if (skipDepth === 0)
        text += chunk;
    },
    onclosetag(name) {
      if (name === "script" || name === "style" || name === "head")
        skipDepth--;
      else if (BLOCK_TAGS.has(name))
        text += `
`;
    }
  });
  parser.write(html);
  parser.end();
  return text.split(`
`).map((line) => line.trim()).filter((line) => line.length > 0).join(`
`);
}
function attributeOf(xml, tag, attribute) {
  const pattern = new RegExp(`<${tag}[^>]*\\s${attribute}="([^"]*)"`, "i");
  return pattern.exec(xml)?.[1] ?? null;
}
function dirnamePosix(path) {
  const at = path.lastIndexOf("/");
  return at === -1 ? "" : path.slice(0, at);
}
function resolveHref(opfDir, href) {
  if (opfDir === "")
    return href;
  const parts = `${opfDir}/${href}`.split("/");
  const resolved = [];
  for (const part of parts) {
    if (part === "" || part === ".")
      continue;
    if (part === "..")
      resolved.pop();
    else
      resolved.push(part);
  }
  return resolved.join("/");
}
function spineEntries(zip) {
  if (!zip.has("META-INF/container.xml"))
    return [];
  const container = zip.read("META-INF/container.xml").toString("utf8");
  const opfPath = attributeOf(container, "rootfile", "full-path");
  if (opfPath === null || !zip.has(opfPath))
    return [];
  const opf = zip.read(opfPath).toString("utf8");
  const opfDir = dirnamePosix(opfPath);
  const hrefById = new Map;
  const itemPattern = /<item\s[^>]*>/gi;
  for (const [tag] of opf.matchAll(itemPattern)) {
    const id = /\sid="([^"]*)"/i.exec(tag)?.[1];
    const href = /\shref="([^"]*)"/i.exec(tag)?.[1];
    if (id !== undefined && href !== undefined)
      hrefById.set(id, href);
  }
  const entries = [];
  const itemrefPattern = /<itemref\s[^>]*idref="([^"]*)"/gi;
  for (const match of opf.matchAll(itemrefPattern)) {
    const idref = match[1];
    if (idref === undefined)
      continue;
    const href = hrefById.get(idref);
    if (href === undefined)
      continue;
    const entry = resolveHref(opfDir, decodeURIComponent(href));
    if (zip.has(entry))
      entries.push(entry);
  }
  return entries;
}
function extractEpub(bytes, options = {}) {
  const sectionCap = options.sectionCap ?? EPUB_SECTION_CAP;
  try {
    const zip = openZip(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
    let entries = spineEntries(zip);
    if (entries.length === 0) {
      entries = zip.names.filter((name) => /\.x?html$/i.test(name)).sort();
    }
    if (entries.length === 0) {
      return {
        ok: false,
        reason: "the archive has no readable sections (no OPF spine, no .xhtml/.html entries) — this does not look like an EPUB book"
      };
    }
    const total = entries.length;
    const extracted = entries.slice(0, sectionCap);
    const parts = [];
    for (const [i, entry] of extracted.entries()) {
      parts.push(`=== section ${i + 1} of ${total} (${entry}) ===`);
      const text = xhtmlToText(zip.read(entry).toString("utf8"));
      parts.push(text.length > 0 ? text : "[no text in this section]");
    }
    if (extracted.length < total) {
      parts.push(`[extraction stopped at the section cap — ${extracted.length} of ${total} sections extracted]`);
    }
    return { ok: true, text: parts.join(`
`), sections: total };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/extract/ipynb.ts
function joinSource(value) {
  if (typeof value === "string")
    return value;
  if (Array.isArray(value)) {
    return value.filter((line) => typeof line === "string").join("");
  }
  return "";
}
var ANSI_ESCAPE = /\u001b\[[0-9;]*[A-Za-z]/g;
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function renderOutput(output) {
  if (!isRecord2(output))
    return [];
  const lines = [];
  switch (output["output_type"]) {
    case "stream": {
      const text = joinSource(output["text"]).trimEnd();
      if (text.length > 0)
        lines.push(text);
      break;
    }
    case "execute_result":
    case "display_data": {
      const data = isRecord2(output["data"]) ? output["data"] : {};
      const plain = joinSource(data["text/plain"]).trimEnd();
      if (plain.length > 0)
        lines.push(plain);
      for (const mime of Object.keys(data)) {
        if (mime !== "text/plain")
          lines.push(`[${mime} output]`);
      }
      break;
    }
    case "error": {
      const name = typeof output["ename"] === "string" ? output["ename"] : "Error";
      const value = typeof output["evalue"] === "string" ? output["evalue"] : "";
      lines.push(`${name}: ${value}`);
      const traceback = output["traceback"];
      if (Array.isArray(traceback)) {
        for (const frame of traceback) {
          if (typeof frame === "string")
            lines.push(frame.replace(ANSI_ESCAPE, ""));
        }
      }
      break;
    }
    default:
      break;
  }
  return lines;
}
function notebookLanguage(notebook) {
  const metadata = isRecord2(notebook["metadata"]) ? notebook["metadata"] : {};
  const languageInfo = isRecord2(metadata["language_info"]) ? metadata["language_info"] : {};
  if (typeof languageInfo["name"] === "string")
    return languageInfo["name"];
  const kernelspec = isRecord2(metadata["kernelspec"]) ? metadata["kernelspec"] : {};
  if (typeof kernelspec["language"] === "string")
    return kernelspec["language"];
  return "";
}
function extractNotebook(bytes) {
  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("utf8"));
  } catch (error) {
    return {
      ok: false,
      reason: `not valid JSON (${error instanceof Error ? error.message : String(error)})`
    };
  }
  if (!isRecord2(parsed))
    return { ok: false, reason: "not a JSON object" };
  const cells = parsed["cells"];
  if (!Array.isArray(cells)) {
    if (Array.isArray(parsed["worksheets"])) {
      return {
        ok: false,
        reason: "this is an nbformat 3 notebook — convert it with `jupyter nbconvert --to notebook` first"
      };
    }
    return { ok: false, reason: "no cells array — this does not look like a notebook" };
  }
  const language = notebookLanguage(parsed);
  const parts = [];
  for (const [i, cell] of cells.entries()) {
    if (!isRecord2(cell))
      continue;
    const type = typeof cell["cell_type"] === "string" ? cell["cell_type"] : "unknown";
    parts.push(`=== cell ${i + 1} of ${cells.length} (${type}) ===`);
    const source = joinSource(cell["source"]).trimEnd();
    if (type === "code") {
      parts.push(`\`\`\`${language}`);
      parts.push(source);
      parts.push("```");
      const outputs = cell["outputs"];
      if (Array.isArray(outputs)) {
        for (const output of outputs)
          parts.push(...renderOutput(output));
      }
    } else if (source.length > 0) {
      parts.push(source);
    }
  }
  return { ok: true, text: parts.join(`
`), cells: cells.length };
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/extract/odf.ts
import { Parser as Parser2 } from "htmlparser2";
var ODP_EMPTY_SLIDE_NOTE = "[no text on this slide — likely image-only; images cannot be extracted]";
function parseContentXml(xml) {
  const implicit = { paragraphs: [] };
  const pages = [];
  let current = implicit;
  let paragraph = "";
  let paragraphDepth = 0;
  const parser = new Parser2({
    onopentag(name, attribs) {
      if (name === "draw:page") {
        current = { paragraphs: [] };
        pages.push(current);
      } else if (name === "text:p" || name === "text:h") {
        if (paragraphDepth === 0)
          paragraph = "";
        paragraphDepth++;
      } else if (paragraphDepth > 0 && name === "text:tab") {
        paragraph += "\t";
      } else if (paragraphDepth > 0 && name === "text:line-break") {
        paragraph += `
`;
      } else if (paragraphDepth > 0 && name === "text:s") {
        const count = Number(attribs["text:c"] ?? "1");
        paragraph += " ".repeat(Number.isFinite(count) && count > 0 ? count : 1);
      }
    },
    ontext(text) {
      if (paragraphDepth > 0)
        paragraph += text;
    },
    onclosetag(name) {
      if (name === "draw:page") {
        current = implicit;
      } else if (name === "text:p" || name === "text:h") {
        paragraphDepth--;
        if (paragraphDepth === 0) {
          const trimmed = paragraph.trim();
          if (trimmed.length > 0)
            current.paragraphs.push(trimmed);
          paragraph = "";
        }
      }
    }
  }, { xmlMode: true });
  parser.write(xml);
  parser.end();
  return { pages, implicit };
}
function readContentXml(bytes) {
  const zip = openZip(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  if (!zip.has("content.xml")) {
    throw new Error("the package has no content.xml entry — this does not look like an OpenDocument file");
  }
  return zip.read("content.xml").toString("utf8");
}
function extractOdt(bytes) {
  try {
    const content = parseContentXml(readContentXml(bytes));
    const paragraphs = [
      ...content.implicit.paragraphs,
      ...content.pages.flatMap((page) => page.paragraphs)
    ];
    return { ok: true, text: paragraphs.join(`
`) };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}
function extractOdp(bytes) {
  try {
    const content = parseContentXml(readContentXml(bytes));
    const pages = content.pages.length > 0 ? content.pages : [content.implicit];
    const parts = [];
    for (const [i, page] of pages.entries()) {
      parts.push(`=== slide ${i + 1} of ${pages.length} ===`);
      parts.push(page.paragraphs.length > 0 ? page.paragraphs.join(`
`) : ODP_EMPTY_SLIDE_NOTE);
    }
    return { ok: true, text: parts.join(`
`), slides: pages.length };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/extract/pdf.ts
import { openPdf } from "clawpdf";
var PDF_EMPTY_PAGE_NOTE = "[no text on this page — likely scanned or image-only; rendered pages cannot be attached]";
var PDF_PAGE_CAP = 200;
async function extractPdf(bytes, options = {}) {
  const pageCap = options.pageCap ?? PDF_PAGE_CAP;
  let pdf;
  try {
    pdf = await openPdf(bytes);
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
  try {
    const pages = pdf.pageCount;
    const extracted = Math.min(pages, pageCap);
    const parts = [];
    for (let n = 1;n <= extracted; n++) {
      const text = pdf.page(n).text().replaceAll(`\r
`, `
`).trim();
      parts.push(`=== page ${n} of ${pages} ===`);
      parts.push(text.length > 0 ? text : PDF_EMPTY_PAGE_NOTE);
    }
    if (extracted < pages) {
      parts.push(`[extraction stopped at the page cap — ${extracted} of ${pages} pages extracted]`);
    }
    return { ok: true, text: parts.join(`
`), pages };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  } finally {
    await pdf[Symbol.asyncDispose]();
  }
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/extract/pptx.ts
import { Parser as Parser3 } from "htmlparser2";
var PPTX_EMPTY_SLIDE_NOTE = "[no text on this slide — likely image-only; images cannot be extracted]";
var PPTX_SLIDE_CAP = 200;
function slideParagraphs(xml) {
  const paragraphs = [];
  let current = "";
  let inParagraph = false;
  let inText = false;
  const parser = new Parser3({
    onopentag(name) {
      if (name === "a:p") {
        inParagraph = true;
        current = "";
      } else if (name === "a:t") {
        inText = true;
      } else if (name === "a:br" && inParagraph) {
        current += `
`;
      }
    },
    ontext(text) {
      if (inText)
        current += text;
    },
    onclosetag(name) {
      if (name === "a:t") {
        inText = false;
      } else if (name === "a:p") {
        inParagraph = false;
        const trimmed = current.trim();
        if (trimmed.length > 0)
          paragraphs.push(trimmed);
        current = "";
      }
    }
  }, { xmlMode: true });
  parser.write(xml);
  parser.end();
  return paragraphs;
}
var SLIDE_ENTRY = /^ppt\/slides\/slide(\d+)\.xml$/;
function resolveSlideTarget(target) {
  if (target.startsWith("/"))
    return target.slice(1);
  const parts = `ppt/${target}`.split("/");
  const resolved = [];
  for (const part of parts) {
    if (part === "" || part === ".")
      continue;
    if (part === "..")
      resolved.pop();
    else
      resolved.push(part);
  }
  return resolved.join("/");
}
function presentationRelTargets(xml) {
  const targets = new Map;
  const parser = new Parser3({
    onopentag(name, attribs) {
      if (name !== "Relationship")
        return;
      const id = attribs["Id"];
      const target = attribs["Target"];
      if (id !== undefined && target !== undefined) {
        targets.set(id, resolveSlideTarget(target));
      }
    }
  }, { xmlMode: true });
  parser.write(xml);
  parser.end();
  return targets;
}
function slideIdOrder(xml) {
  const ids = [];
  let inList = false;
  const parser = new Parser3({
    onopentag(name, attribs) {
      if (name === "p:sldIdLst")
        inList = true;
      else if (inList && name === "p:sldId") {
        const rid = attribs["r:id"];
        if (rid !== undefined)
          ids.push(rid);
      }
    },
    onclosetag(name) {
      if (name === "p:sldIdLst")
        inList = false;
    }
  }, { xmlMode: true });
  parser.write(xml);
  parser.end();
  return ids;
}
function orderedSlideEntries(zip) {
  if (zip.has("ppt/presentation.xml") && zip.has("ppt/_rels/presentation.xml.rels")) {
    const targets = presentationRelTargets(zip.read("ppt/_rels/presentation.xml.rels").toString("utf8"));
    const ordered = slideIdOrder(zip.read("ppt/presentation.xml").toString("utf8")).map((rid) => targets.get(rid)).filter((entry) => entry !== undefined && zip.has(entry));
    if (ordered.length > 0)
      return ordered;
  }
  const numbered = [];
  for (const name of zip.names) {
    const match = SLIDE_ENTRY.exec(name);
    const captured = match?.[1];
    if (captured !== undefined)
      numbered.push({ entry: name, n: Number(captured) });
  }
  return numbered.sort((a, b) => a.n - b.n).map(({ entry }) => entry);
}
function notesEntryFor(slideEntry) {
  const match = SLIDE_ENTRY.exec(slideEntry);
  const captured = match?.[1];
  return captured === undefined ? null : `ppt/notesSlides/notesSlide${captured}.xml`;
}
function extractPptx(bytes, options = {}) {
  const slideCap = options.slideCap ?? PPTX_SLIDE_CAP;
  try {
    const zip = openZip(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
    const entries = orderedSlideEntries(zip);
    if (entries.length === 0) {
      return {
        ok: false,
        reason: "the package has no ppt/slides/*.xml entries — this does not look like a PowerPoint deck"
      };
    }
    const total = entries.length;
    const extracted = entries.slice(0, slideCap);
    const parts = [];
    for (const [i, entry] of extracted.entries()) {
      parts.push(`=== slide ${i + 1} of ${total} ===`);
      const body = slideParagraphs(zip.read(entry).toString("utf8"));
      parts.push(body.length > 0 ? body.join(`
`) : PPTX_EMPTY_SLIDE_NOTE);
      const notesEntry = notesEntryFor(entry);
      if (notesEntry !== null && zip.has(notesEntry)) {
        const notes = slideParagraphs(zip.read(notesEntry).toString("utf8"));
        if (notes.length > 0) {
          parts.push("[speaker notes]");
          parts.push(notes.join(`
`));
        }
      }
    }
    if (extracted.length < total) {
      parts.push(`[extraction stopped at the slide cap — ${extracted.length} of ${total} slides extracted]`);
    }
    return { ok: true, text: parts.join(`
`), slides: total };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/extract/rtf.ts
var SKIP_DESTINATIONS = new Set([
  "fonttbl",
  "colortbl",
  "stylesheet",
  "info",
  "pict",
  "object",
  "header",
  "footer",
  "headerl",
  "headerr",
  "headerf",
  "footerl",
  "footerr",
  "footerf",
  "ftnsep",
  "ftnsepc",
  "generator",
  "themedata",
  "colorschememapping",
  "datastore",
  "latentstyles",
  "listtable",
  "listoverridetable",
  "revtbl",
  "xmlnstbl",
  "fldinst"
]);
var CHARACTER_WORDS = new Map([
  ["par", `
`],
  ["line", `
`],
  ["tab", "\t"],
  ["emdash", "—"],
  ["endash", "–"],
  ["emspace", " "],
  ["enspace", " "],
  ["qmspace", " "],
  ["bullet", "•"],
  ["lquote", "‘"],
  ["rquote", "’"],
  ["ldblquote", "“"],
  ["rdblquote", "”"],
  ["cell", "\t"],
  ["row", `
`]
]);
var CP1252_HIGH = {
  128: "€",
  130: "‚",
  131: "ƒ",
  132: "„",
  133: "…",
  134: "†",
  135: "‡",
  136: "ˆ",
  137: "‰",
  138: "Š",
  139: "‹",
  140: "Œ",
  142: "Ž",
  145: "‘",
  146: "’",
  147: "“",
  148: "”",
  149: "•",
  150: "–",
  151: "—",
  152: "˜",
  153: "™",
  154: "š",
  155: "›",
  156: "œ",
  158: "ž",
  159: "Ÿ"
};
function cp1252Char(byte) {
  return CP1252_HIGH[byte] ?? String.fromCharCode(byte);
}
function isAsciiLetter(code) {
  return code >= 65 && code <= 90 || code >= 97 && code <= 122;
}
function isAsciiDigit(code) {
  return code >= 48 && code <= 57;
}
function extractRtf(bytes) {
  const input = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("latin1");
  if (!input.startsWith("{\\rtf")) {
    return { ok: false, reason: "does not start with an {\\rtf header" };
  }
  let text = "";
  const stack = [];
  let group = { skipped: false, unicodeSkip: 1 };
  let pendingFallback = 0;
  const emit = (chunk) => {
    if (group.skipped)
      return;
    if (pendingFallback > 0) {
      pendingFallback--;
      return;
    }
    text += chunk;
  };
  let at = 0;
  while (at < input.length) {
    const ch = input[at];
    if (ch === "{") {
      stack.push(group);
      group = { ...group };
      at++;
      if (input.startsWith("\\*", at)) {
        group.skipped = true;
        at += 2;
      }
      continue;
    }
    if (ch === "}") {
      group = stack.pop() ?? { skipped: false, unicodeSkip: 1 };
      at++;
      continue;
    }
    if (ch !== "\\") {
      if (ch === `
` || ch === "\r") {
        at++;
        continue;
      }
      emit(ch ?? "");
      at++;
      continue;
    }
    let wordEnd = at + 1;
    while (wordEnd < input.length && isAsciiLetter(input.charCodeAt(wordEnd))) {
      wordEnd++;
    }
    if (wordEnd > at + 1) {
      const word = input.slice(at + 1, wordEnd);
      let paramEnd = wordEnd;
      if (input.charCodeAt(paramEnd) === 45)
        paramEnd++;
      let digitEnd = paramEnd;
      while (digitEnd < input.length && isAsciiDigit(input.charCodeAt(digitEnd))) {
        digitEnd++;
      }
      const param = digitEnd > paramEnd ? input.slice(wordEnd, digitEnd) : undefined;
      at = param === undefined ? wordEnd : digitEnd;
      if (input[at] === " ")
        at++;
      if (SKIP_DESTINATIONS.has(word)) {
        group.skipped = true;
        continue;
      }
      if (word === "uc") {
        group.unicodeSkip = param === undefined ? 1 : Math.max(0, Number(param));
        continue;
      }
      if (word === "u" && param !== undefined) {
        let code = Number(param);
        if (code < 0)
          code += 65536;
        emit(String.fromCharCode(code));
        if (!group.skipped)
          pendingFallback = group.unicodeSkip;
        continue;
      }
      const mapped = CHARACTER_WORDS.get(word);
      if (mapped !== undefined)
        emit(mapped);
      continue;
    }
    const symbol = input[at + 1];
    if (symbol === undefined)
      break;
    if (symbol === "'") {
      const hex = input.slice(at + 2, at + 4);
      const byte = Number.parseInt(hex, 16);
      if (Number.isFinite(byte))
        emit(cp1252Char(byte));
      at += 4;
      continue;
    }
    if (symbol === "\\" || symbol === "{" || symbol === "}")
      emit(symbol);
    else if (symbol === "~")
      emit(" ");
    else if (symbol === "_")
      emit("-");
    else if (symbol === `
` || symbol === "\r")
      emit(`
`);
    at += 2;
  }
  return { ok: true, text: text.replace(/\n+$/, "") };
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/extract/sheet.ts
import { read, utils } from "xlsx";
var SHEET_ROW_CAP = 5000;
function extractSheets(buffer, rowCap = SHEET_ROW_CAP) {
  let workbook;
  try {
    workbook = read(buffer, { type: "buffer", dense: true, sheetRows: rowCap + 1 });
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
  const parts = [];
  const sheets = [];
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (sheet === undefined)
      continue;
    const ref = sheet["!fullref"] ?? sheet["!ref"];
    const range = typeof ref === "string" ? utils.decode_range(ref) : null;
    const rows = range === null ? 0 : range.e.r - range.s.r + 1;
    const cols = range === null ? 0 : range.e.c - range.s.c + 1;
    sheets.push({ name, rows, cols });
    parts.push(`=== sheet "${name}" (${rows} rows x ${cols} cols) ===`);
    if (rows === 0) {
      parts.push("[empty sheet]");
      continue;
    }
    const tsv = utils.sheet_to_csv(sheet, { FS: "\t", blankrows: false }).replace(/\n+$/, "");
    const lines = tsv.split(`
`);
    if (lines.length > rowCap) {
      parts.push(lines.slice(0, rowCap).join(`
`));
      parts.push(`[sheet truncated at ${rowCap} rows]`);
    } else {
      parts.push(tsv);
    }
  }
  return { ok: true, text: parts.join(`
`), sheets };
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/read-file-content.ts
var EXTRACTION_CACHE_LIMIT = 20;
var extractionCache = createStatCache(EXTRACTION_CACHE_LIMIT);
function decodeText(buffer, encoding) {
  switch (encoding) {
    case "utf8":
      return buffer.toString("utf8");
    case "utf16le":
      return buffer.toString("utf16le").replace(/^\uFEFF/, "");
    case "utf16be": {
      const swapped = Buffer.from(buffer).swap16();
      return swapped.toString("utf16le").replace(/^\uFEFF/, "");
    }
  }
}
async function extractDocument(detected, buffer, path) {
  switch (detected.kind) {
    case "pdf": {
      const result = await extractPdf(buffer);
      if (!result.ok)
        throw new Error(`Could not extract text from PDF ${path}: ${result.reason}`);
      return { kind: "pdf", text: result.text, pages: result.pages };
    }
    case "docx": {
      const result = await extractDocx(buffer);
      if (!result.ok) {
        throw new Error(`Could not extract text from DOCX ${path}: ${result.reason}`);
      }
      return { kind: "docx", text: result.text };
    }
    case "pptx": {
      const result = extractPptx(buffer);
      if (!result.ok) {
        throw new Error(`Could not extract text from PPTX ${path}: ${result.reason}`);
      }
      return { kind: "pptx", text: result.text, slides: result.slides };
    }
    case "odt": {
      const result = extractOdt(buffer);
      if (!result.ok) {
        throw new Error(`Could not extract text from ODT ${path}: ${result.reason}`);
      }
      return { kind: "odt", text: result.text };
    }
    case "odp": {
      const result = extractOdp(buffer);
      if (!result.ok) {
        throw new Error(`Could not extract text from ODP ${path}: ${result.reason}`);
      }
      return { kind: "odp", text: result.text, slides: result.slides };
    }
    case "epub": {
      const result = extractEpub(buffer);
      if (!result.ok) {
        throw new Error(`Could not extract text from EPUB ${path}: ${result.reason}`);
      }
      return { kind: "epub", text: result.text, sections: result.sections };
    }
    case "rtf": {
      const result = extractRtf(buffer);
      if (!result.ok) {
        throw new Error(`Could not extract text from RTF ${path}: ${result.reason}`);
      }
      return { kind: "rtf", text: result.text };
    }
    case "sheet": {
      const result = extractSheets(buffer);
      if (!result.ok) {
        throw new Error(`Could not extract data from spreadsheet ${path}: ${result.reason}`);
      }
      return { kind: "sheet", format: detected.format, text: result.text, sheets: result.sheets };
    }
  }
}
async function loadFileContent(buffer, path, id) {
  const detected = detectFileKind(buffer, path);
  switch (detected.kind) {
    case "text":
      return { kind: "text", text: decodeText(buffer, detected.encoding) };
    case "pdf":
    case "docx":
    case "pptx":
    case "odt":
    case "odp":
    case "epub":
    case "rtf":
    case "sheet":
      return extractionCache.get(path, id, () => extractDocument(detected, buffer, path));
    case "ipynb":
      return extractionCache.get(path, id, () => {
        const result = extractNotebook(buffer);
        if (!result.ok) {
          return Promise.resolve({ kind: "text", text: decodeText(buffer, "utf8") });
        }
        return Promise.resolve({ kind: "ipynb", text: result.text, cells: result.cells });
      });
    case "image": {
      let size = null;
      try {
        size = imageSize(buffer);
      } catch {
        size = null;
      }
      return {
        kind: "image",
        format: detected.format,
        width: size?.width ?? null,
        height: size?.height ?? null
      };
    }
    case "video":
      return { kind: "video", format: detected.format };
    case "audio":
      return { kind: "audio", format: detected.format };
    case "binary":
      throw new Error(`${path} is ${detected.description} — read returns text only. ` + "Use bash (unzip -l, strings, xxd) to inspect it if needed.");
  }
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/tools/read.ts
function buildMediaHint(verb) {
  return `${verb} media (images, video, audio) returns metadata only`;
}
function createReadTool(opts) {
  const { workspace, noun, dirConventions } = opts;
  const io = opts.io ?? localIoProvider(workspace.root);
  const oversizeHint = opts.oversizeHint ?? "Use bash (head, sed -n, rg) to extract the part you need.";
  const imageUnavailableHint = opts.imageUnavailableHint ?? "If you need to see this image, ask the user to attach it to the chat.";
  const mediaUnavailableHint = opts.mediaUnavailableHint ?? "If you need its contents, extract what you can with bash (e.g. ffmpeg frames from a video, read as images) or ask the user about it.";
  const conventionsHint = dirConventions ? ` When a read first enters a directory with its own ${dirConventions.fileName} conventions file, the result includes it under directory_conventions (once per directory per session) — honor those conventions for work in that directory.` : "";
  const mediaHint = buildMediaHint("reading");
  const editHint = opts.includeEditGuidance ?? true ? " Read a file before editing it so your edits target the current text." : "";
  return defineTool6({
    description: `Read a file from the ${noun}, returning line-numbered text. Documents are converted to plain text: PDF (per-page markers), DOCX/ODT/RTF, PPTX/ODP decks (per-slide markers, speaker notes), spreadsheets (.xlsx, .xlsm, .xls, .ods; TSV per sheet), EPUB (per-section markers), and Jupyter notebooks (per-cell markers); ${mediaHint}.${editHint} Returns up to 2000 lines per call by default; page bigger files with offset/limit.` + conventionsHint,
    inputSchema: z7.object({
      path: z7.string().min(1).describe(`File path, relative to the ${noun} root.`),
      offset: z7.number().int().positive().optional().describe("1-based line to start reading from."),
      limit: z7.number().int().positive().optional().describe("Max number of lines to return.")
    }),
    async execute({ path, offset, limit }, ctx) {
      const abs = workspace.resolve(path);
      const rel = workspace.relativize(abs);
      const fio = io(ctx);
      const stat = await fio.stat(abs);
      if (stat === null)
        throw new Error(`${rel} does not exist.`);
      if (!stat.isFile) {
        throw new Error(`${rel} is not a regular file. Use glob to list a directory.`);
      }
      if (stat.size > READ_FILE_MAX_BYTES) {
        throw new Error(`${rel} is ${stat.size} bytes — too large to read (max ${READ_FILE_MAX_BYTES}). ` + oversizeHint);
      }
      const buffer = await fio.readFile(abs);
      if (buffer === null)
        throw new Error(`${rel} does not exist.`);
      const content = await loadFileContent(buffer, rel, {
        mtimeMs: stat.mtimeMs,
        size: stat.size
      });
      const riders = await (async () => {
        try {
          return await dirConventions?.tracker.collect(ctx?.session?.id, rel, async (absPath) => {
            const bytes = await fio.readFile(absPath);
            return bytes === null ? null : bytes.toString("utf8");
          }) ?? [];
        } catch {
          return [];
        }
      })();
      const conventions = riders.length > 0 ? { directory_conventions: riders } : {};
      switch (content.kind) {
        case "text":
          return {
            path: rel,
            ...buildFileView(content.text, { offset, limit }),
            ...conventions
          };
        case "pdf":
          return {
            path: rel,
            source: "pdf",
            pages: content.pages,
            ...buildFileView(content.text, { offset, limit }),
            ...conventions
          };
        case "docx":
          return {
            path: rel,
            source: "docx",
            ...buildFileView(content.text, { offset, limit }),
            ...conventions
          };
        case "pptx":
        case "odp":
          return {
            path: rel,
            source: content.kind,
            slides: content.slides,
            ...buildFileView(content.text, { offset, limit }),
            ...conventions
          };
        case "odt":
        case "rtf":
          return {
            path: rel,
            source: content.kind,
            ...buildFileView(content.text, { offset, limit }),
            ...conventions
          };
        case "epub":
          return {
            path: rel,
            source: "epub",
            sections: content.sections,
            ...buildFileView(content.text, { offset, limit }),
            ...conventions
          };
        case "ipynb":
          return {
            path: rel,
            source: "ipynb",
            cells: content.cells,
            ...buildFileView(content.text, { offset, limit }),
            ...conventions
          };
        case "sheet":
          return {
            path: rel,
            source: "sheet",
            format: content.format,
            sheets: content.sheets,
            ...buildFileView(content.text, { offset, limit }),
            ...conventions
          };
        case "image": {
          const meta = {
            path: rel,
            source: "image",
            format: content.format,
            width: content.width,
            height: content.height,
            bytes: stat.size
          };
          return {
            ...meta,
            note: `Image content cannot be returned as a tool result (text/json only). ${imageUnavailableHint}`,
            ...conventions
          };
        }
        case "video":
        case "audio": {
          const kind = content.kind;
          const mediaType = kind === "video" ? videoMediaType(content.format) : audioMediaType(content.format);
          const meta = {
            path: rel,
            source: kind,
            format: content.format,
            mediaType,
            bytes: stat.size
          };
          return {
            ...meta,
            note: `${kind === "video" ? "Video" : "Audio"} content cannot be returned as a tool result (text/json only). ${mediaUnavailableHint}`,
            ...conventions
          };
        }
      }
    }
  });
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/tools/tasks.ts
import { defineDynamic as defineDynamic2, defineTool as defineTool7 } from "eve/tools";
import { z as z8 } from "zod";
var DEFAULT_WAIT_MS = 120000;
function elapsedMs(task) {
  const end = task.status === "running" ? Date.now() : task.finishedAt;
  return end - task.startedAt;
}
function peek(task) {
  return {
    task_id: task.id,
    tool: task.tool,
    label: task.label,
    status: task.status,
    elapsedMs: elapsedMs(task),
    ...task.progress !== undefined ? { progress: task.progress } : {},
    ...task.status === "error" || task.status === "lost" ? { error: task.error } : {}
  };
}
function full(task) {
  const base = {
    task_id: task.id,
    tool: task.tool,
    label: task.label,
    status: task.status,
    elapsedMs: elapsedMs(task)
  };
  if (task.status === "done")
    return { ...base, result: task.result };
  if (task.status === "error" || task.status === "lost")
    return { ...base, error: task.error };
  return { ...base, ...task.progress !== undefined ? { progress: task.progress } : {} };
}
function buildTasksToolset(opts) {
  const { registry, backgroundables } = opts;
  const [firstOp, ...restOps] = backgroundables;
  if (!firstOp)
    return null;
  const toolNames = [firstOp.name, ...restOps.map((o) => o.name)];
  const catalog = backgroundables.map((o) => `- ${o.name}: ${o.description}
  input: ${JSON.stringify(o.inputJsonSchema)}`).join(`
`);
  const runAsyncDescription = "Start a tool running in the BACKGROUND and return immediately with a task id, instead of blocking until it finishes. Use it for long work whose result your next step doesn't need yet (tests, builds, installs) so you can keep working in parallel; poll with check_tasks and collect the result with await_task. If your very next step needs the output, just call the tool directly instead." + `

Backgroundable tools (pass \`input\` matching the tool's own schema):
` + catalog;
  const runAsyncBaseParams = {
    tool: z8.enum(toolNames).describe("Which backgroundable tool to run."),
    input: z8.record(z8.string(), z8.unknown()).describe("Arguments for that tool — the same object you'd pass calling it directly.")
  };
  function startAsync(args, ctx) {
    const { tool, input } = args;
    const op = backgroundables.find((o) => o.name === tool);
    if (!op)
      throw new Error(`Unknown backgroundable tool: ${tool}`);
    const { label, work, progress } = op.start(input, { ctx });
    const taskId = registry.spawnTask(tool, label, work, ctx?.session?.id);
    if (progress) {
      registry.updateTaskProgress(taskId, progress());
      const interval = setInterval(() => registry.updateTaskProgress(taskId, progress()), 500);
      work.finally(() => clearInterval(interval)).catch(() => {
        return;
      });
    }
    return {
      task_id: taskId,
      tool,
      status: "running",
      note: "Started in the background. If your next actions don't depend on this, keep working and call check_tasks / await_task later; otherwise call await_task now."
    };
  }
  const runAsync = defineTool7({
    description: runAsyncDescription,
    inputSchema: z8.object(runAsyncBaseParams),
    execute: (args, ctx) => startAsync(args, ctx)
  });
  return {
    run_async: runAsync,
    check_tasks: defineTool7({
      description: "List background tasks and their status without blocking; returns `runningCount` plus the task list. For tasks that support progress (notably bash), includes a live stdout/stderr preview. Call await_task to collect a task's final result.",
      inputSchema: z8.object({}),
      execute(_args, ctx) {
        const tasks = registry.listTasks(ctx?.session?.id).map(peek);
        return { runningCount: tasks.filter((t) => t.status === "running").length, tasks };
      }
    }),
    await_task: defineTool7({
      description: "Block until a background task finishes (up to wait_ms), then return its full result. Use it when your next step needs the task's final output. If the wait elapses while it's still running, returns the running status plus any live progress so you can decide to keep waiting or move on.",
      inputSchema: z8.object({
        task_id: z8.string().min(1).describe("Task id returned by run_async or a backgrounded bash call."),
        wait_ms: z8.number().int().positive().optional().describe(`Max time to block in ms (default ${DEFAULT_WAIT_MS}).`)
      }),
      async execute({ task_id, wait_ms }, ctx) {
        const task = await registry.awaitTask(task_id, wait_ms ?? DEFAULT_WAIT_MS, ctx?.abortSignal);
        if (!task) {
          throw new Error(`No such task: ${task_id}. Call check_tasks to list the current tasks and their ids, then resend with a real one.`);
        }
        return full(task);
      }
    })
  };
}
function createTasksTools(opts) {
  return defineDynamic2({
    events: {
      "session.started": () => buildTasksToolset(opts)
    }
  });
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/tools/todo.ts
import { defineTool as defineTool8 } from "eve/tools";
import { todo as eveTodo } from "eve/tools/defaults";

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/todo-discipline.ts
function isRecord3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
var TODO_STATUSES = ["pending", "in_progress", "completed", "cancelled"];
var TODO_PRIORITIES = ["high", "medium", "low"];
function isOneOf(value, options) {
  return typeof value === "string" && options.includes(value);
}
function parseTodoItem(value) {
  if (!isRecord3(value))
    return null;
  const { content, status, priority } = value;
  if (typeof content !== "string")
    return null;
  if (!isOneOf(status, TODO_STATUSES))
    return null;
  if (!isOneOf(priority, TODO_PRIORITIES))
    return null;
  return { content, status, priority };
}
function parseTodoItems(value) {
  if (!Array.isArray(value))
    return null;
  const items = [];
  for (const entry of value) {
    const item = parseTodoItem(entry);
    if (item === null)
      return null;
    items.push(item);
  }
  return items;
}
function parseTodoListResult(value) {
  if (!isRecord3(value))
    return null;
  return parseTodoItems(value.todos);
}
function validateTodoWrite(args) {
  const { next, previous } = args;
  const violations = [];
  const seen = new Map;
  for (const [index, item] of next.entries()) {
    const content = item.content.trim();
    if (content === "") {
      violations.push({ kind: "empty_content", index });
      continue;
    }
    seen.set(content, (seen.get(content) ?? 0) + 1);
  }
  for (const [content, count] of seen) {
    if (count > 1)
      violations.push({ kind: "duplicate_content", content });
  }
  const inProgress = next.filter((item) => item.status === "in_progress");
  if (inProgress.length > 1) {
    violations.push({
      kind: "multiple_in_progress",
      contents: inProgress.map((item) => item.content.trim())
    });
  }
  if (previous !== null) {
    const previousStatus = new Map;
    for (const item of previous)
      previousStatus.set(item.content.trim(), item.status);
    for (const item of next) {
      const content = item.content.trim();
      if (item.status === "completed" && previousStatus.get(content) === "pending") {
        violations.push({ kind: "pending_completed_jump", content });
      }
    }
  }
  return violations;
}
function describeViolation(violation) {
  switch (violation.kind) {
    case "empty_content":
      return `item ${violation.index + 1} has empty content — every todo needs a short description.`;
    case "duplicate_content":
      return `duplicate content ${JSON.stringify(violation.content)} — content identifies an item across writes, so make each unique.`;
    case "multiple_in_progress":
      return `${violation.contents.length} items are in_progress (${violation.contents.map((content) => JSON.stringify(content)).join(", ")}) — keep exactly one task in_progress at a time.`;
    case "pending_completed_jump":
      return `${JSON.stringify(violation.content)} jumped pending → completed — mark it in_progress when you start, then completed when done.`;
    default:
      return assertNeverViolation(violation);
  }
}
function assertNeverViolation(violation) {
  throw new Error(`Unknown todo violation: ${JSON.stringify(violation)}`);
}
function formatTodoViolations(violations) {
  const lines = violations.map((violation) => `- ${describeViolation(violation)}`);
  return [
    "todo write rejected — the list is unchanged. Fix these and resend the full list:",
    ...lines
  ].join(`
`);
}
var TODO_DISCIPLINE_RIDER = [
  "",
  "Discipline (enforced — an invalid write is rejected and the list stays unchanged):",
  "- Every item needs non-empty content, unique within the list (content identifies an item across writes).",
  "- At most ONE item may be in_progress.",
  "- An item that was pending cannot jump straight to completed — mark it in_progress first, then completed."
].join(`
`);

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/tools/todo.ts
function isRecord4(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function createTodoTool(opts = {}) {
  const base = opts.base ?? eveTodo;
  return defineTool8({
    ...base,
    description: `${base.description}
${TODO_DISCIPLINE_RIDER}`,
    async execute(input, ctx) {
      const todosValue = isRecord4(input) ? input.todos : undefined;
      const next = todosValue === undefined ? null : parseTodoItems(todosValue);
      if (next === null)
        return base.execute(input, ctx);
      return withPathLock(`todo:${ctx.session.id}`, async () => {
        const previous = parseTodoListResult(await base.execute({}, ctx));
        const violations = validateTodoWrite({ next, previous });
        if (violations.length > 0) {
          throw new Error(formatTodoViolations(violations));
        }
        return base.execute(input, ctx);
      });
    }
  });
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/tools/webfetch.ts
import { defineTool as defineTool9 } from "eve/tools";
import { z as z9 } from "zod";
import { join as join5 } from "node:path";

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/bounded-output.ts
import { appendFileSync, mkdirSync as mkdirSync3, writeFileSync as writeFileSync3 } from "node:fs";
import { dirname as dirname3 } from "node:path";
var HEAD_CHARS = 25000;
var TAIL_CHARS = 25000;
var TOOL_OUTPUT_DIRNAME = "tool-outputs";
function renderTruncationMarker(opts) {
  const where = opts.label === undefined ? "" : `; full output: ${opts.label}`;
  return `
… [output truncated: showing first ${opts.headChars} and last ${opts.tailChars} of ${opts.totalChars} chars${where}]
`;
}
var isHighSurrogate = (code) => code >= 55296 && code <= 56319;
var isLowSurrogate = (code) => code >= 56320 && code <= 57343;
var endsOnHighSurrogate = (text) => text.length > 0 && isHighSurrogate(text.charCodeAt(text.length - 1));
function takeTail(text, cap) {
  if (text.length <= cap)
    return text;
  let start = text.length - cap;
  if (isLowSurrogate(text.charCodeAt(start)))
    start += 1;
  return text.slice(start);
}
function createBoundedCapture(opts = {}) {
  const headCap = opts.headChars ?? HEAD_CHARS;
  const tailCap = opts.tailChars ?? TAIL_CHARS;
  let head = "";
  let tail = "";
  let total = 0;
  let overflowed = false;
  let spill = opts.spillPath ? "none" : "failed";
  let spillCarry = "";
  const writeSpill = (chunk, first) => {
    if (spill === "failed" || opts.spillPath === undefined)
      return;
    let text = spillCarry + chunk;
    if (endsOnHighSurrogate(text)) {
      spillCarry = text.slice(-1);
      text = text.slice(0, -1);
    } else {
      spillCarry = "";
    }
    try {
      if (first) {
        mkdirSync3(dirname3(opts.spillPath), { recursive: true });
        writeFileSync3(opts.spillPath, text);
        spill = "live";
      } else {
        appendFileSync(opts.spillPath, text);
      }
    } catch {
      spill = "failed";
    }
  };
  return {
    append(chunk) {
      total += chunk.length;
      if (!overflowed) {
        const room = headCap - head.length;
        if (chunk.length <= room) {
          head += chunk;
          return;
        }
        overflowed = true;
        let cut = room;
        if (cut > 0 && isHighSurrogate(chunk.charCodeAt(cut - 1)))
          cut -= 1;
        head += chunk.slice(0, cut);
        let remainder = chunk.slice(cut);
        if (endsOnHighSurrogate(head)) {
          remainder = head.slice(-1) + remainder;
          head = head.slice(0, -1);
        }
        writeSpill(head + remainder, true);
        tail = takeTail(remainder, tailCap);
        return;
      }
      writeSpill(chunk, false);
      tail = takeTail(tail + chunk, tailCap);
    },
    snapshot() {
      if (!overflowed) {
        return { text: head, head, tail: "", totalChars: total, truncated: false, spillPath: null };
      }
      if (head.length + tail.length === total) {
        return { text: head + tail, head, tail, totalChars: total, truncated: false, spillPath: null };
      }
      const marker = renderTruncationMarker({
        headChars: head.length,
        tailChars: tail.length,
        totalChars: total,
        label: spill === "live" ? opts.spillLabel ?? opts.spillPath : undefined
      });
      return {
        text: `${head}${marker}${tail}`,
        head,
        tail,
        totalChars: total,
        truncated: true,
        spillPath: spill === "live" && opts.spillPath !== undefined ? opts.spillPath : null
      };
    },
    latest() {
      return overflowed ? tail : head;
    },
    totalChars() {
      return total;
    }
  };
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/web-fetch.ts
import { Parser as Parser4 } from "htmlparser2";
import { parseHTML as parseHTML2 } from "linkedom";
import TurndownService from "turndown";

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/web-page.ts
import Defuddle from "defuddle";
import { parseHTML } from "linkedom";
var asField = (value) => {
  if (typeof value !== "string")
    return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};
function visibleTextLength(html) {
  return html.replace(/<(script|style|noscript)\b[\s\S]*?<\/\1\s*>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;
}
function extractMainContent(html, url) {
  let parsed;
  try {
    const { document } = parseHTML(html);
    parsed = new Defuddle(document, {
      url
    }).parse();
  } catch {
    return null;
  }
  const contentHtml = typeof parsed.content === "string" ? parsed.content : "";
  const extractedLength = visibleTextLength(contentHtml);
  if (extractedLength === 0)
    return null;
  if (extractedLength < 500 && extractedLength * 4 < visibleTextLength(html))
    return null;
  return {
    contentHtml,
    title: asField(parsed.title),
    author: asField(parsed.author),
    published: asField(parsed.published),
    site: asField(parsed.site)
  };
}
function buildMetadataHeader(page) {
  const byline = [
    page.author === null ? null : `By ${page.author}`,
    page.site,
    page.published === null ? null : `Published ${page.published}`
  ].filter((part) => part !== null).join(" · ");
  const lines = [];
  if (page.title !== null)
    lines.push(`# ${page.title}`);
  if (byline !== "")
    lines.push(`> ${byline}`);
  return lines.length === 0 ? null : lines.join(`

`);
}
var JS_RENDERED_DOMAIN_HINTS = [
  {
    suffixes: ["x.com", "twitter.com"],
    hint: "X (Twitter) renders posts with client-side JavaScript and blocks anonymous scraping, so a plain fetch can't see the post."
  },
  {
    suffixes: ["reddit.com"],
    hint: "Reddit renders client-side — fetch the JSON view (append .json to the post URL) or the same path on old.reddit.com instead."
  },
  {
    suffixes: ["linkedin.com"],
    hint: "LinkedIn requires login; anonymous fetches get a wall instead of the content."
  },
  {
    suffixes: ["instagram.com", "threads.net", "tiktok.com", "facebook.com"],
    hint: "This site renders client-side and gates content behind login, so a plain fetch can't see it."
  },
  {
    suffixes: ["youtube.com", "youtu.be"],
    hint: "YouTube pages are a client-rendered player; the video itself isn't fetchable as text."
  }
];
function jsRenderedDomainHint(url) {
  let hostname;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  for (const { suffixes, hint } of JS_RENDERED_DOMAIN_HINTS) {
    for (const suffix of suffixes) {
      if (hostname === suffix || hostname.endsWith(`.${suffix}`))
        return hint;
    }
  }
  return null;
}
var COLLAPSE_RENDERED_MAX_CHARS = 200;
var COLLAPSE_HTML_MIN_CHARS = 2000;
function buildContentCollapseNote(opts) {
  if (opts.renderedChars >= COLLAPSE_RENDERED_MAX_CHARS)
    return null;
  if (opts.documentTextChars >= COLLAPSE_RENDERED_MAX_CHARS)
    return null;
  if (opts.htmlChars < COLLAPSE_HTML_MIN_CHARS)
    return null;
  const base = `The page produced almost no readable text (${opts.renderedChars} chars from ${opts.htmlChars} chars of HTML) — its content likely renders with client-side JavaScript or sits behind a login or bot wall.`;
  const hint = jsRenderedDomainHint(opts.url);
  return hint === null ? base : `${base} ${hint}`;
}
function looksLikeRawHtmlOutput(rendered) {
  if (rendered.length === 0)
    return false;
  const tags = rendered.match(/<\/?[a-z][a-z0-9-]*(?:\s[^<>]*)?>/gi);
  if (tags === null || tags.length < 10)
    return false;
  const tagChars = tags.reduce((sum, tag) => sum + tag.length, 0);
  return tagChars / rendered.length > 0.1;
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/web-fetch.ts
var WEB_FETCH_MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
var WEB_FETCH_DEFAULT_TIMEOUT_SECONDS = 30;
var WEB_FETCH_PDF_DEFAULT_TIMEOUT_SECONDS = 60;
var WEB_FETCH_MAX_TIMEOUT_SECONDS = 120;
var BROWSER_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
var FALLBACK_USER_AGENT = "agent-sdk";
function acceptHeader(format) {
  switch (format) {
    case "markdown":
      return "text/markdown;q=1.0, text/x-markdown;q=0.9, text/plain;q=0.8, text/html;q=0.7, */*;q=0.1";
    case "text":
      return "text/plain;q=1.0, text/markdown;q=0.9, text/html;q=0.8, */*;q=0.1";
    case "html":
      return "text/html;q=1.0, application/xhtml+xml;q=0.9, text/plain;q=0.8, text/markdown;q=0.7, */*;q=0.1";
  }
}
function buildWebFetchHeaders(format, userAgent = BROWSER_USER_AGENT) {
  return {
    Accept: acceptHeader(format),
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": userAgent
  };
}
function convertHtmlToMarkdown(html) {
  const turndown = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*"
  });
  turndown.remove(["script", "style", "meta", "link"]);
  const { document } = parseHTML2(`<x-turndown id="turndown-root">${html}</x-turndown>`);
  const root = document.getElementById("turndown-root");
  if (root === null)
    throw new Error("unreachable: the turndown-root wrapper always parses");
  return turndown.turndown(root);
}
var SKIPPED_HTML_TAGS = ["script", "style", "noscript", "iframe", "object", "embed"];
function extractTextFromHtml(html) {
  let text = "";
  const skipStack = [];
  const parser = new Parser4({
    onopentag(name) {
      if (skipStack.length > 0 || SKIPPED_HTML_TAGS.includes(name)) {
        skipStack.push(name);
      }
    },
    ontext(input) {
      if (skipStack.length === 0)
        text += input;
    },
    onclosetag(name) {
      if (skipStack.length > 0 && skipStack[skipStack.length - 1] === name) {
        skipStack.pop();
      }
    }
  });
  parser.write(html);
  parser.end();
  return text.split(`
`).map((line) => line.replace(/[ \t]+/g, " ").trim()).join(`
`).replace(/\n{3,}/g, `

`).trim();
}
function isHtmlContentType(contentType) {
  const mime = contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  return mime === "text/html" || mime === "application/xhtml+xml";
}
function looksLikeHtml(content) {
  const trimmed = content.trimStart().slice(0, 512).toLowerCase();
  return trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html") || /^<(!--|head|body|div|p|h[1-6]|span|a|ul|ol|li|table|script|style)\b/.test(trimmed);
}
function renderWebText(content, contentType, format, url) {
  const isHtml = isHtmlContentType(contentType) || looksLikeHtml(content);
  if (!isHtml || format === "html")
    return { text: content };
  const page = extractMainContent(content, url);
  const bodyHtml = page === null ? content : page.contentHtml;
  const converted = format === "markdown" ? convertHtmlToMarkdown(bodyHtml) : extractTextFromHtml(bodyHtml);
  const header = page === null ? null : buildMetadataHeader(page);
  const text = header === null ? converted : `${header}

${converted}`;
  const notes = [];
  const collapse = buildContentCollapseNote({
    url,
    renderedChars: converted.trim().length,
    htmlChars: content.length,
    documentTextChars: visibleTextLength(content)
  });
  if (collapse !== null)
    notes.push(collapse);
  if (format === "markdown" && looksLikeRawHtmlOutput(converted)) {
    notes.push('The markdown conversion left substantial raw HTML in the output — treat it as partially converted, or re-fetch with format "html" for the true page.');
  }
  return notes.length === 0 ? { text } : { text, note: notes.join(" ") };
}
function assertHttpUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Not a valid URL: ${url}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("URL must start with http:// or https://");
  }
}
async function fetchWebResource(opts) {
  const { url, format, timeoutMs, pdfTimeoutMs } = opts;
  const fetchImpl = opts.fetchImpl ?? fetch;
  assertHttpUrl(url);
  const controller = new AbortController;
  const abortFromCaller = () => controller.abort(opts.abortSignal?.reason);
  if (opts.abortSignal?.aborted) {
    abortFromCaller();
  } else {
    opts.abortSignal?.addEventListener("abort", abortFromCaller, { once: true });
  }
  const startedAt = Date.now();
  let deadlineMs = timeoutMs;
  let timer = setTimeout(() => controller.abort(), deadlineMs);
  const timedOut = () => new Error(`Request timed out after ${deadlineMs / 1000}s: ${url}`);
  try {
    const headers = buildWebFetchHeaders(format);
    let response;
    try {
      response = await fetchImpl(url, { headers, signal: controller.signal });
      if (response.status === 403 && response.headers.get("cf-mitigated") === "challenge") {
        response = await fetchImpl(url, {
          headers: { ...headers, "User-Agent": FALLBACK_USER_AGENT },
          signal: controller.signal
        });
      }
    } catch (error) {
      if (opts.abortSignal?.aborted)
        throw abortReason3(opts.abortSignal);
      if (controller.signal.aborted)
        throw timedOut();
      throw error;
    }
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}: ${url}`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    const finalUrl = response.url === "" ? url : response.url;
    if (pdfTimeoutMs !== undefined && pdfTimeoutMs > deadlineMs && responseLooksLikePdf(contentType, finalUrl)) {
      clearTimeout(timer);
      deadlineMs = pdfTimeoutMs;
      const remaining = Math.max(deadlineMs - (Date.now() - startedAt), 0);
      timer = setTimeout(() => controller.abort(), remaining);
    }
    const contentLength = response.headers.get("content-length");
    if (contentLength !== null && Number.parseInt(contentLength, 10) > WEB_FETCH_MAX_RESPONSE_BYTES) {
      throw new Error(`Response too large (content-length exceeds the ${WEB_FETCH_MAX_RESPONSE_BYTES}-byte limit): ${url}`);
    }
    let arrayBuffer;
    try {
      arrayBuffer = await response.arrayBuffer();
    } catch (error) {
      if (opts.abortSignal?.aborted)
        throw abortReason3(opts.abortSignal);
      if (controller.signal.aborted)
        throw timedOut();
      throw error;
    }
    if (arrayBuffer.byteLength > WEB_FETCH_MAX_RESPONSE_BYTES) {
      throw new Error(`Response too large (exceeds the ${WEB_FETCH_MAX_RESPONSE_BYTES}-byte limit): ${url}`);
    }
    return {
      body: Buffer.from(arrayBuffer),
      contentType,
      finalUrl
    };
  } finally {
    clearTimeout(timer);
    opts.abortSignal?.removeEventListener("abort", abortFromCaller);
  }
}
function abortReason3(signal) {
  if (signal.reason instanceof Error)
    return signal.reason;
  return new DOMException("The tool call was cancelled", "AbortError");
}
function responseLooksLikePdf(contentType, finalUrl) {
  const mime = contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  return mime === "application/pdf" || urlLooksLikePdf(finalUrl);
}
function resolveWebFetchTimeoutMs(timeoutSeconds, url) {
  const fallback = urlLooksLikePdf(url) ? WEB_FETCH_PDF_DEFAULT_TIMEOUT_SECONDS : WEB_FETCH_DEFAULT_TIMEOUT_SECONDS;
  const seconds = timeoutSeconds ?? fallback;
  return Math.min(Math.max(seconds, 1), WEB_FETCH_MAX_TIMEOUT_SECONDS) * 1000;
}
function urlLooksLikePdf(url) {
  if (url === undefined)
    return false;
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return false;
  }
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/tools/webfetch.ts
var SPILL_EXTENSION = {
  markdown: "md",
  text: "txt",
  html: "html"
};
function spillFilename(format, kind) {
  const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const ext = kind === "extracted" ? "txt" : SPILL_EXTENSION[format];
  return `webfetch-${runId}.${ext}`;
}
var ZIP_MAGIC2 = [80, 75, 3, 4];
function startsWithBytes(buf, magic) {
  if (buf.length < magic.length)
    return false;
  for (let i = 0;i < magic.length; i++) {
    if (buf[i] !== magic[i])
      return false;
  }
  return true;
}
var CONTENT_TYPE_EXTENSIONS = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "application/msword": ".doc",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.oasis.opendocument.text": ".odt",
  "application/vnd.oasis.opendocument.spreadsheet": ".ods",
  "application/vnd.oasis.opendocument.presentation": ".odp",
  "application/pdf": ".pdf",
  "application/epub+zip": ".epub",
  "application/rtf": ".rtf",
  "text/rtf": ".rtf",
  "application/x-ipynb+json": ".ipynb",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "video/x-matroska": ".mkv",
  "video/x-msvideo": ".avi",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/ogg": ".ogg",
  "audio/flac": ".flac",
  "audio/mp4": ".m4a"
};
var LEGACY_TO_MODERN_EXT = {
  ".doc": ".docx",
  ".xls": ".xlsx",
  ".ppt": ".pptx"
};
function pathLabelForFetch(finalUrl, contentType, body) {
  const pathname = new URL(finalUrl).pathname;
  const extMatch = pathname.match(/(\.[a-z0-9]+)$/i);
  if (extMatch) {
    const captured = extMatch[1];
    if (!captured)
      return pathname;
    const currentExt = captured.toLowerCase();
    if (startsWithBytes(body, ZIP_MAGIC2)) {
      const modernExt = LEGACY_TO_MODERN_EXT[currentExt];
      if (modernExt) {
        return pathname.slice(0, -currentExt.length) + modernExt;
      }
    }
    return pathname;
  }
  const mime = contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  let ext = CONTENT_TYPE_EXTENSIONS[mime];
  if (!ext)
    return pathname;
  if (startsWithBytes(body, ZIP_MAGIC2)) {
    ext = LEGACY_TO_MODERN_EXT[ext] ?? ext;
  }
  return pathname + ext;
}
var DEFAULT_MAX_INLINE_CONTENT_CHARS = 1e5;
var INLINE_TAIL_FRACTION = 0.25;
function createWebFetchTool(opts) {
  const { workspace, spillDir, fetchImpl } = opts;
  const imageUnavailableHint = opts.imageUnavailableHint ?? "If you need to see this image, ask the user to attach it to the chat.";
  const mediaUnavailableHint = opts.mediaUnavailableHint ?? "Use bash (curl -o) to download it if you need to process it.";
  const maxInlineContentChars = opts.maxInlineContentChars ?? DEFAULT_MAX_INLINE_CONTENT_CHARS;
  const inlineTailChars = Math.floor(maxInlineContentChars * INLINE_TAIL_FRACTION);
  const inlineHeadChars = maxInlineContentChars - inlineTailChars;
  const bounded = (text, format, kind) => {
    const capture = spillDir !== undefined ? (() => {
      const spillPath = join5(spillDir, spillFilename(format, kind));
      return createBoundedCapture({
        spillPath,
        spillLabel: workspace.relativize(spillPath)
      });
    })() : createBoundedCapture({
      headChars: inlineHeadChars,
      tailChars: inlineTailChars
    });
    capture.append(text);
    const snapshot = capture.snapshot();
    return {
      content: snapshot.text,
      totalChars: snapshot.totalChars,
      truncated: snapshot.truncated
    };
  };
  const mediaHint = buildMediaHint("fetching");
  const overflowHint = spillDir !== undefined ? "Content over the in-context budget is truncated head+tail and the complete output is spilled to a file named in the truncation marker — read or grep that file instead of re-fetching." : "Content returns whole; only extremely long pages truncate head+tail (the marker shows the boundary) — refetch a narrower page or a more specific URL if the middle matters.";
  return defineTool9({
    description: `Fetch a URL and return its content. HTML pages are reduced to their main content (boilerplate stripped, title/author/date header) and converted to readable markdown by default (set format to "text" for plain text or "html" for the raw page). Fetched documents (PDF, DOCX/ODT/RTF, PPTX/ODP, spreadsheets, EPUB, Jupyter notebooks) are converted to plain text; ${mediaHint}. ${overflowHint} Default timeout ${WEB_FETCH_DEFAULT_TIMEOUT_SECONDS}s (${WEB_FETCH_PDF_DEFAULT_TIMEOUT_SECONDS}s for PDFs), max ${WEB_FETCH_MAX_TIMEOUT_SECONDS}s; responses over 5 MB error. Read-only: one HTTP GET, no side effects.`,
    inputSchema: z9.object({
      url: z9.string().min(1).describe("The URL to fetch. Must start with http:// or https://."),
      format: z9.enum(["markdown", "text", "html"]).optional().describe('How to render HTML responses: "markdown" (default), "text", or "html" (raw). Non-HTML content is unaffected.'),
      timeout: z9.number().int().positive().optional().describe(`Timeout in seconds (default ${WEB_FETCH_DEFAULT_TIMEOUT_SECONDS}, max ${WEB_FETCH_MAX_TIMEOUT_SECONDS}).`)
    }),
    async execute({ url, format, timeout }, ctx) {
      const renderFormat = format ?? "markdown";
      const fetched = await fetchWebResource({
        url,
        format: renderFormat,
        timeoutMs: resolveWebFetchTimeoutMs(timeout, url),
        ...timeout === undefined ? { pdfTimeoutMs: WEB_FETCH_PDF_DEFAULT_TIMEOUT_SECONDS * 1000 } : {},
        ...fetchImpl !== undefined ? { fetchImpl } : {},
        ...ctx?.abortSignal !== undefined ? { abortSignal: ctx.abortSignal } : {}
      });
      const { body, contentType, finalUrl } = fetched;
      const redirect = finalUrl !== url ? { finalUrl } : {};
      const meta = { url, ...redirect, contentType };
      const label = pathLabelForFetch(finalUrl, contentType, body);
      const detected = detectFileKind(body, label);
      if (detected.kind === "binary") {
        throw new Error(`Fetched content is ${detected.description} — webfetch returns text and media metadata only. ` + "Use bash (curl -o) to download it if needed.");
      }
      const content = await loadFileContent(body, label, {
        mtimeMs: Date.now(),
        size: body.byteLength
      });
      switch (content.kind) {
        case "text": {
          const rendered = renderWebText(content.text, contentType, renderFormat, finalUrl);
          return {
            ...meta,
            format: renderFormat,
            ...rendered.note === undefined ? {} : { note: rendered.note },
            ...bounded(rendered.text, renderFormat, "text")
          };
        }
        case "pdf":
          return {
            ...meta,
            source: "pdf",
            pages: content.pages,
            ...bounded(content.text, renderFormat, "extracted")
          };
        case "docx":
          return {
            ...meta,
            source: "docx",
            ...bounded(content.text, renderFormat, "extracted")
          };
        case "pptx":
        case "odp":
          return {
            ...meta,
            source: content.kind,
            slides: content.slides,
            ...bounded(content.text, renderFormat, "extracted")
          };
        case "odt":
        case "rtf":
          return {
            ...meta,
            source: content.kind,
            ...bounded(content.text, renderFormat, "extracted")
          };
        case "epub":
          return {
            ...meta,
            source: "epub",
            sections: content.sections,
            ...bounded(content.text, renderFormat, "extracted")
          };
        case "ipynb":
          return {
            ...meta,
            source: "ipynb",
            cells: content.cells,
            ...bounded(content.text, renderFormat, "extracted")
          };
        case "sheet":
          return {
            ...meta,
            source: "sheet",
            sheetFormat: content.format,
            sheets: content.sheets,
            ...bounded(content.text, renderFormat, "extracted")
          };
        case "image": {
          const imageMeta = {
            ...meta,
            source: "image",
            imageFormat: content.format,
            width: content.width,
            height: content.height,
            bytes: body.byteLength
          };
          return {
            ...imageMeta,
            note: `Image content cannot be returned as a tool result (text/json only). ${imageUnavailableHint}`
          };
        }
        case "video":
        case "audio": {
          const kind = content.kind;
          const mediaType = kind === "video" ? videoMediaType(content.format) : audioMediaType(content.format);
          const mediaMeta = {
            ...meta,
            source: kind,
            mediaFormat: content.format,
            mediaType,
            bytes: body.byteLength
          };
          return {
            ...mediaMeta,
            note: `${kind === "video" ? "Video" : "Audio"} content cannot be returned as a tool result (text/json only). ${mediaUnavailableHint}`
          };
        }
      }
    }
  });
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/tools/write.ts
import { defineTool as defineTool10 } from "eve/tools";
import { z as z10 } from "zod";
function createWriteTool(opts) {
  const { workspace, noun } = opts;
  const io = opts.io ?? localIoProvider(workspace.root);
  return defineTool10({
    description: `Write a complete file to the ${noun}, creating parent directories and overwriting any existing file. For a small change to an existing file, prefer edit so you don't have to reproduce the whole file.`,
    inputSchema: z10.object({
      path: z10.string().min(1).describe(`File path, relative to the ${noun} root.`),
      content: z10.string().describe("The full contents to write.")
    }),
    async execute({ path, content }, ctx) {
      const abs = workspace.resolve(path);
      const fio = io(ctx);
      return withPathLock(abs, async () => {
        const stat = await fio.stat(abs);
        if (stat !== null && !stat.isFile) {
          throw new Error(`${workspace.relativize(abs)} is a directory — nothing was written. Give a file path (e.g. a file inside that directory) instead.`);
        }
        const prior = stat === null ? null : await fio.readFile(abs);
        const created = prior === null;
        const priorHadBom = prior !== null && prior.length >= 3 && prior[0] === 239 && prior[1] === 187 && prior[2] === 191;
        const out = priorHadBom && !splitBom(content).bom ? `\uFEFF${content}` : content;
        await fio.writeFile(abs, out);
        return {
          ok: true,
          path: workspace.relativize(abs),
          created,
          bytes: Buffer.byteLength(out)
        };
      });
    }
  });
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/sandbox-io.ts
import ignore2 from "ignore";
function shellSingleQuote(value) {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}
function defaultResolveSession(ctx) {
  if (ctx === undefined) {
    throw new Error("Sandbox-backed workspace tools need an eve tool context (ctx.getSandbox); none was provided.");
  }
  return ctx.getSandbox();
}
function throwIfAborted2(signal) {
  if (signal?.aborted !== true)
    return;
  if (signal.reason instanceof Error)
    throw signal.reason;
  throw new DOMException("The tool call was cancelled", "AbortError");
}
function sandboxIoProvider(options) {
  const resolve3 = options.resolveSession ?? defaultResolveSession;
  return (ctx) => createSandboxIo({
    root: options.root,
    session: () => resolve3(ctx),
    ...ctx === undefined ? {} : { abortSignal: ctx.abortSignal }
  });
}
function createSandboxIo(opts) {
  const { root } = opts;
  let resolved = null;
  const session = () => {
    resolved ??= Promise.resolve(opts.session());
    return resolved;
  };
  async function run(command) {
    throwIfAborted2(opts.abortSignal);
    const sb = await session();
    const result = await sb.run({ command, workingDirectory: root });
    throwIfAborted2(opts.abortSignal);
    return result;
  }
  return {
    async stat(abs) {
      const q = shellSingleQuote(abs);
      const result = await run(`stat -c '%s %Y %F' -- ${q} 2>/dev/null || stat -f '%z %m %HT' -- ${q}`);
      if (result.exitCode !== 0)
        return null;
      const match = /^(\d+)\s+(\d+)\s+(.+)$/.exec(result.stdout.trim());
      if (match === null)
        return null;
      const [, size, mtimeSec, kind] = match;
      if (size === undefined || mtimeSec === undefined || kind === undefined)
        return null;
      return {
        isFile: /regular/i.test(kind),
        size: Number(size),
        mtimeMs: Number(mtimeSec) * 1000
      };
    },
    async readFile(abs) {
      throwIfAborted2(opts.abortSignal);
      const sb = await session();
      const bytes = await sb.readBinaryFile({ path: abs });
      throwIfAborted2(opts.abortSignal);
      return bytes === null ? null : Buffer.from(bytes);
    },
    async writeFile(abs, content) {
      throwIfAborted2(opts.abortSignal);
      const sb = await session();
      const bytes = typeof content === "string" ? new TextEncoder().encode(content) : content;
      await sb.writeBinaryFile({ path: abs, content: bytes });
      throwIfAborted2(opts.abortSignal);
    },
    async listFiles(scope) {
      const rel = scope === undefined ? undefined : relativizeWithin(root, scope);
      const spec = rel === undefined || rel === "." ? "" : ` -- ${shellSingleQuote(rel)}`;
      const listed = await run(`git ls-files --cached --others --exclude-standard -z${spec}`);
      if (listed.exitCode === 0) {
        const files2 = listed.stdout.split("\x00").filter((p) => p.length > 0);
        const deleted = await run(`git ls-files --deleted -z${spec}`);
        if (deleted.exitCode !== 0)
          return files2;
        const gone = new Set(deleted.stdout.split("\x00").filter((p) => p.length > 0));
        return gone.size === 0 ? files2 : files2.filter((p) => !gone.has(p));
      }
      const start = rel === undefined || rel === "." ? "." : shellSingleQuote(rel);
      const prune = `\\( ${[...ALWAYS_IGNORED].map((dir) => `-name ${dir}`).join(" -o ")} \\) -prune`;
      const found = await run(`find ${start} ${prune} -o -type f -print`);
      if (found.exitCode !== 0) {
        throw new Error(`Could not list workspace files in the sandbox: ${found.stderr.trim() || `find exited ${found.exitCode}`}`);
      }
      const files = found.stdout.split(`
`).map((line) => line.startsWith("./") ? line.slice(2) : line).filter((line) => line.length > 0);
      const sb = await session();
      const rootIgnore = await sb.readBinaryFile({ path: `${root}/.gitignore` });
      throwIfAborted2(opts.abortSignal);
      if (rootIgnore === null)
        return files;
      const matcher = ignore2().add(Buffer.from(rootIgnore).toString("utf8"));
      return files.filter((file) => !matcher.ignores(file));
    },
    async search(options) {
      const scopeRel = options.scope === undefined ? "." : relativizeWithin(root, options.scope);
      const viaRg = await runSearch(run, buildRipgrepCommand(options, scopeRel));
      if (viaRg.exitCode === 0 || viaRg.exitCode === 1) {
        return parseSearchOutput(viaRg.stdout, options.maxMatches, viaRg.flooded);
      }
      if (viaRg.exitCode !== 127) {
        throw new Error(`Search failed in the sandbox (rg exited ${viaRg.exitCode}): ${viaRg.stderr.trim()}`);
      }
      const viaGrep = await runSearch(run, buildPosixGrepCommand(options, scopeRel));
      if (viaGrep.exitCode === 0 || viaGrep.exitCode === 1) {
        const parsed = parseSearchOutput(viaGrep.stdout, Number.MAX_SAFE_INTEGER, viaGrep.flooded);
        const globRe = options.glob === undefined ? null : globToRegExp(options.glob);
        const sb = await session();
        const rootIgnore = await sb.readBinaryFile({ path: `${root}/.gitignore` });
        throwIfAborted2(opts.abortSignal);
        const matcher = rootIgnore === null ? null : ignore2().add(Buffer.from(rootIgnore).toString("utf8"));
        const kept = parsed.matches.filter((m) => (globRe === null || globRe.test(m.file)) && (matcher === null || !matcher.ignores(m.file)));
        return {
          matches: kept.slice(0, options.maxMatches),
          stopped: parsed.stopped === "output-cap" ? "output-cap" : kept.length >= options.maxMatches ? "max-matches" : parsed.stopped,
          skippedLargeFiles: null
        };
      }
      throw new Error(`Search failed in the sandbox (grep exited ${viaGrep.exitCode}): ${viaGrep.stderr.trim()}`);
    }
  };
}
var SEARCH_OUTPUT_CAP_BYTES = 10 * 1024 * 1024;
var SEARCH_EXIT_SENTINEL = "__ZO_SEARCH_EXIT__";
async function runSearch(run, command) {
  const wrapped = `{ ${command}; printf '\\n${SEARCH_EXIT_SENTINEL}:%d\\n' "$?"; } | head -c ${SEARCH_OUTPUT_CAP_BYTES}`;
  const result = await run(wrapped);
  const parsed = extractSearchExit(result.stdout);
  if (parsed.exitCode === null) {
    if (result.exitCode !== 0) {
      return { exitCode: result.exitCode, stdout: parsed.stdout, stderr: result.stderr, flooded: false };
    }
    return { exitCode: 0, stdout: parsed.stdout, stderr: result.stderr, flooded: true };
  }
  return {
    exitCode: parsed.exitCode,
    stdout: parsed.stdout,
    stderr: result.stderr,
    flooded: false
  };
}
function extractSearchExit(stdout) {
  const match = new RegExp(`\\n?${SEARCH_EXIT_SENTINEL}:(\\d+)\\n?$`).exec(stdout);
  if (match === null || match[1] === undefined) {
    return { stdout, exitCode: null };
  }
  return { stdout: stdout.slice(0, match.index), exitCode: Number(match[1]) };
}
function buildRipgrepCommand(options, scopeRel) {
  const parts = [
    "rg",
    "--line-number",
    "--with-filename",
    "--no-heading",
    "--color=never",
    "--hidden",
    ...[...ALWAYS_IGNORED].map((dir) => `--glob ${shellSingleQuote(`!**/${dir}`)}`),
    `--max-filesize ${MAX_SEARCH_FILE_BYTES}`
  ];
  if (options.ignoreCase)
    parts.push("--ignore-case");
  if (options.glob !== undefined)
    parts.push(`--glob ${shellSingleQuote(options.glob)}`);
  parts.push(`--max-count ${options.maxMatches}`);
  parts.push(`--regexp ${shellSingleQuote(options.pattern)}`);
  parts.push("--", shellSingleQuote(scopeRel));
  return parts.join(" ");
}
function buildPosixGrepCommand(options, scopeRel) {
  const prune = `\\( ${[...ALWAYS_IGNORED].map((dir) => `-name ${dir}`).join(" -o ")} \\) -prune`;
  const filters = ["-type f", `-size -${MAX_SEARCH_FILE_BYTES}c`];
  const grep = [
    "grep",
    "-n",
    "-H",
    "-E",
    "--color=never",
    ...options.ignoreCase ? ["-i"] : [],
    `-m ${options.maxMatches}`,
    "-e",
    shellSingleQuote(options.pattern),
    "--"
  ].join(" ");
  return `find ${shellSingleQuote(scopeRel)} ${prune} -o ${filters.join(" ")} -exec ${grep} {} +`;
}
function parseSearchLine(line) {
  const s = line.endsWith("\r") ? line.slice(0, -1) : line;
  let from = 0;
  for (;; ) {
    const colon = s.indexOf(":", from);
    if (colon === -1)
      return null;
    if (colon === 0) {
      from = 1;
      continue;
    }
    let end = colon + 1;
    while (end < s.length && s.charCodeAt(end) >= 48 && s.charCodeAt(end) <= 57)
      end++;
    if (end > colon + 1 && s.charCodeAt(end) === 58) {
      return { file: s.slice(0, colon), lineNo: s.slice(colon + 1, end), text: s.slice(end + 1) };
    }
    from = colon + 1;
  }
}
function parseSearchOutput(stdout, maxMatches, flooded = false) {
  const matches = [];
  let stopped = flooded ? "output-cap" : false;
  for (const line of stdout.split(`
`)) {
    if (line.length === 0)
      continue;
    const parsed = parseSearchLine(line);
    if (parsed === null)
      continue;
    const { file, lineNo, text } = parsed;
    matches.push({
      file: file.startsWith("./") ? file.slice(2) : file,
      line: Number(lineNo),
      text
    });
    if (matches.length >= maxMatches) {
      if (stopped === false)
        stopped = "max-matches";
      break;
    }
  }
  return { matches, stopped, skippedLargeFiles: null };
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/run.ts
import { spawn } from "node:child_process";
import { join as join6 } from "node:path";
var MAX_PREVIEW = 20000;
function capturePreview(capture) {
  const latest = capture.latest();
  if (capture.totalChars() <= MAX_PREVIEW)
    return latest;
  return `… [earlier output truncated]
${latest.slice(-MAX_PREVIEW)}`;
}
function createCommandRunner(opts) {
  const { workspace, spillDir } = opts;
  function startCommand(command, runOpts = {}) {
    const cwd = runOpts.cwd ? workspace.resolve(runOpts.cwd) : workspace.root;
    const timeoutMs = runOpts.timeoutMs ?? 120000;
    const child = spawn(command, { cwd, shell: true, env: process.env, detached: true });
    const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const captureFor = (stream) => {
      const spillPath = join6(spillDir, `bash-${runId}-${stream}.log`);
      return createBoundedCapture({ spillPath, spillLabel: workspace.relativize(spillPath) });
    };
    const stdoutCapture = captureFor("stdout");
    const stderrCapture = captureFor("stderr");
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let timedOut = false;
    let closed = false;
    const killTree = (signal) => {
      const pid = child.pid;
      if (pid === undefined)
        return;
      try {
        process.kill(-pid, signal);
      } catch {
        child.kill(signal);
      }
    };
    const timer = setTimeout(() => {
      timedOut = true;
      killTree("SIGKILL");
    }, timeoutMs);
    const result = new Promise((resolvePromise) => {
      child.stdout.on("data", (d) => {
        const chunk = d.toString();
        stdoutBytes += Buffer.byteLength(chunk);
        stdoutCapture.append(chunk);
        runOpts.onOutput?.(chunk);
      });
      child.stderr.on("data", (d) => {
        const chunk = d.toString();
        stderrBytes += Buffer.byteLength(chunk);
        stderrCapture.append(chunk);
        runOpts.onOutput?.(chunk);
      });
      child.on("close", (code) => {
        closed = true;
        clearTimeout(timer);
        resolvePromise({
          stdout: stdoutCapture.snapshot().text,
          stderr: stderrCapture.snapshot().text,
          exitCode: code,
          timedOut
        });
      });
      child.on("error", (err) => {
        closed = true;
        clearTimeout(timer);
        resolvePromise({
          stdout: stdoutCapture.snapshot().text,
          stderr: `${stderrCapture.snapshot().text}${err.message}`,
          exitCode: null,
          timedOut
        });
      });
    });
    return {
      result,
      progress() {
        return {
          stdout: capturePreview(stdoutCapture),
          stderr: capturePreview(stderrCapture),
          stdoutBytes,
          stderrBytes,
          stdoutTruncated: stdoutCapture.totalChars() > MAX_PREVIEW,
          stderrTruncated: stderrCapture.totalChars() > MAX_PREVIEW
        };
      },
      kill() {
        if (closed)
          return;
        killTree("SIGTERM");
      }
    };
  }
  return {
    startCommand,
    runCommand: (command, runOpts) => startCommand(command, runOpts).result
  };
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/sandbox-run.ts
var MAX_SPILL_RETAIN_CHARS = 5 * 1024 * 1024;
var STREAM_DRAIN_GRACE_MS = 1000;
function defaultResolveSession2(ctx) {
  if (ctx === undefined) {
    throw new Error("The sandbox bash tool needs an eve tool context (ctx.getSandbox); none was provided.");
  }
  return ctx.getSandbox();
}
function requireExecSession(session) {
  const spawn2 = session.spawn;
  if (typeof spawn2 !== "function") {
    throw new Error("This sandbox session does not support spawn(); the sandbox bash tool needs a spawn-capable session.");
  }
  return session;
}
function sandboxRunnerProvider(options) {
  const resolve3 = options.resolveSession ?? defaultResolveSession2;
  return (ctx) => createSandboxRunner({
    root: options.root,
    session: () => resolve3(ctx),
    spillDir: options.spillDir
  });
}
function createSandboxRunner(opts) {
  const { root, spillDir } = opts;
  let resolved = null;
  const session = () => {
    resolved ??= Promise.resolve(opts.session()).then(requireExecSession);
    return resolved;
  };
  function startCommand(command, runOpts = {}) {
    const cwd = runOpts.cwd ? resolveWithin(root, runOpts.cwd) : root;
    const timeoutMs = runOpts.timeoutMs ?? 120000;
    const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const retaining = spillDir !== undefined;
    const newStream = () => ({
      capture: createBoundedCapture({}),
      retained: [],
      retainedChars: 0,
      overCap: !retaining,
      bytes: 0
    });
    const stdoutState = newStream();
    const stderrState = newStream();
    const emit = (state, text) => {
      if (text.length === 0)
        return;
      state.capture.append(text);
      if (!state.overCap) {
        state.retainedChars += text.length;
        if (state.retainedChars > MAX_SPILL_RETAIN_CHARS) {
          state.overCap = true;
          state.retained.length = 0;
        } else {
          state.retained.push(text);
        }
      }
      runOpts.onOutput?.(text);
    };
    const readers = [];
    const pump = async (stream, state) => {
      const decoder = new TextDecoder;
      const reader = stream.getReader();
      readers.push(reader);
      for (;; ) {
        const { done, value } = await reader.read();
        if (done)
          break;
        state.bytes += value.byteLength;
        emit(state, decoder.decode(value, { stream: true }));
      }
      emit(state, decoder.decode());
    };
    const settleText = async (state, stream, sb) => {
      const snap = state.capture.snapshot();
      if (!snap.truncated)
        return snap.text;
      if (spillDir === undefined || state.overCap || sb === null)
        return snap.text;
      const path = `${spillDir}/bash-${runId}-${stream}.log`;
      try {
        await sb.writeBinaryFile({
          path,
          content: new TextEncoder().encode(state.retained.join(""))
        });
      } catch {
        return snap.text;
      }
      const marker = renderTruncationMarker({
        headChars: snap.head.length,
        tailChars: snap.tail.length,
        totalChars: snap.totalChars,
        label: relativizeWithin(root, path)
      });
      return `${snap.head}${marker}${snap.tail}`;
    };
    let timedOut = false;
    let settled = false;
    let killRequested = false;
    let procRef = null;
    const killProc = () => {
      const proc = procRef;
      if (proc === null)
        return;
      Promise.resolve(proc.kill()).then(() => {
        return;
      }, () => {
        return;
      });
    };
    let abortConnect = () => {
      return;
    };
    const connectAborted = new Promise((resolve3) => {
      abortConnect = () => resolve3(null);
    });
    const result = (async () => {
      let sb = null;
      const timer = setTimeout(() => {
        timedOut = true;
        killProc();
        abortConnect();
      }, timeoutMs);
      try {
        const connect = (async () => {
          const s = await session();
          const proc2 = await s.spawn({ command, workingDirectory: cwd });
          return { s, proc: proc2 };
        })();
        connect.then(({ proc: proc2 }) => {
          procRef = proc2;
          if (killRequested || timedOut)
            killProc();
        }, () => {
          return;
        });
        const connected = await Promise.race([connect, connectAborted]);
        if (connected === null) {
          return {
            stdout: "",
            stderr: timedOut ? "" : "killed before the sandbox process started",
            exitCode: null,
            timedOut
          };
        }
        sb = connected.s;
        const proc = connected.proc;
        const pumps = [pump(proc.stdout, stdoutState), pump(proc.stderr, stderrState)];
        for (const p of pumps)
          p.catch(() => {
            return;
          });
        const exit = await Promise.resolve(proc.wait());
        const drained = Promise.allSettled(pumps);
        const graceTimer = setTimeout(() => {
          for (const r of readers) {
            Promise.resolve(r.cancel()).then(() => {
              return;
            }, () => {
              return;
            });
          }
        }, STREAM_DRAIN_GRACE_MS);
        try {
          await drained;
        } finally {
          clearTimeout(graceTimer);
        }
        return {
          stdout: await settleText(stdoutState, "stdout", sb),
          stderr: await settleText(stderrState, "stderr", sb),
          exitCode: exit.exitCode,
          timedOut
        };
      } catch (err) {
        killProc();
        const message = timedOut ? "" : err instanceof Error ? err.message : String(err);
        return {
          stdout: await settleText(stdoutState, "stdout", sb),
          stderr: `${await settleText(stderrState, "stderr", sb)}${message}`,
          exitCode: null,
          timedOut
        };
      } finally {
        clearTimeout(timer);
        settled = true;
      }
    })();
    return {
      result,
      progress() {
        return {
          stdout: capturePreview(stdoutState.capture),
          stderr: capturePreview(stderrState.capture),
          stdoutBytes: stdoutState.bytes,
          stderrBytes: stderrState.bytes,
          stdoutTruncated: stdoutState.capture.totalChars() > MAX_PREVIEW,
          stderrTruncated: stderrState.capture.totalChars() > MAX_PREVIEW
        };
      },
      kill() {
        if (settled)
          return;
        killRequested = true;
        killProc();
        abortConnect();
      }
    };
  }
  return {
    startCommand,
    runCommand: (command, runOpts) => startCommand(command, runOpts).result
  };
}
// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/build-externals.ts
var STDLIB_EXTERNAL_DEPENDENCIES = [
  "ai",
  "clawpdf",
  "defuddle",
  "htmlparser2",
  "ignore",
  "image-size",
  "linkedom",
  "mammoth",
  "turndown",
  "xlsx",
  "zod"
];
// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/task.ts
import { defineAgent } from "eve";
import { defineDynamic as defineDynamic3, defineInstructions as defineInstructions2 } from "eve/instructions";

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/visible-reasoning.ts
var ANTHROPIC_ADAPTIVE_THINKING_MODELS = [
  /^anthropic\/claude-fable-/,
  /^anthropic\/claude-mythos-/,
  /^anthropic\/claude-(?:opus|sonnet)-4\.(?:[6-9]|\d{2,})/,
  /^anthropic\/claude-(?:opus|sonnet)-(?:[5-9]|\d{2,})/
];
var GOOGLE_THINKING_MODELS = [/^google\/gemini-(?:[3-9]|\d{2,})/];
function visibleReasoningModelOptions(modelId) {
  if (ANTHROPIC_ADAPTIVE_THINKING_MODELS.some((pattern) => pattern.test(modelId))) {
    return {
      providerOptions: {
        anthropic: { thinking: { type: "adaptive", display: "summarized" } }
      }
    };
  }
  if (GOOGLE_THINKING_MODELS.some((pattern) => pattern.test(modelId))) {
    return {
      providerOptions: {
        google: { thinkingConfig: { includeThoughts: true } }
      }
    };
  }
  return;
}

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/task.ts
var TASK_DISABLED_BUILTINS = ["ask_question"];
function expectedTaskToolNames(options) {
  const parent = new Set(options.parentToolNames);
  const excluded = options.excludedParentTools ?? [];
  for (const name of excluded) {
    if (!parent.has(name)) {
      throw new Error(`excludedParentTools names "${name}", which is not a parent tool — a stale exclusion would silently weaken the manifest guard`);
    }
  }
  const names = new Set(options.parentToolNames.filter((name) => !excluded.includes(name)));
  for (const name of TASK_DISABLED_BUILTINS) {
    if (names.has(name)) {
      throw new Error(`"${name}" is both a parent tool and a task-disabled builtin — re-export or shim, not both`);
    }
    names.add(name);
  }
  return [...names].sort();
}
function buildTaskMarkdown(opts) {
  const noun = opts?.workspaceNoun ?? "workspace";
  return `## Working as a delegated task

You are a delegated worker: a copy of the parent agent, handed one self-contained task in this ${noun}. Your **final message is your entire deliverable** — the caller sees nothing else you did, so make it complete and self-contained.

- **Do the task asked, completely.** Cite concrete paths and line references (\`src/parser.ts:42\`) for every claim about code, so the caller can jump straight to it.
- **Decide, don't ask.** You cannot ask the user anything: make the reasonable call yourself and note it in your report. If you're genuinely blocked, report the blocker as your result — never guess silently.
- **Stay in your write scope.** Touch only the files your task calls for; the caller may be running sibling workers in parallel with their own scopes, and overlapping edits clobber.
- **Honor the requested thoroughness.** "quick" means the first solid result and stop; "very thorough" means check every plausible angle before concluding; "medium" sits between. Unspecified means medium.
- **Do not delegate onward.** Eve's default delegation depth stops task children from spawning grandchildren. Finish the assigned task yourself and report any blocker to the caller.
- **Background tasks work, but \`notify\` doesn't.** You can \`run_async\` and \`await_task\`, but \`notify\` watchers queue matches that never deliver — you don't idle waiting for user input, so use \`await_task\` or \`check_tasks\` to poll instead.
- **Report outcomes, not process.** Skip the narration of your work; include what changed, what you verified, and only what changes what the caller does next.

Structure your final report:

- **Findings** — what you found or did, each claim about code with its \`path:line\`.
- **Recommendation** — the concrete next action for the caller ("none" is a valid answer).
- **Artifacts** — files you created or modified, by path (omit when you touched nothing).

Never include full file contents, verbose reasoning, or a transcript of your exploration — the caller pays context for every token you return. Target roughly 500–1500 tokens.`;
}
function createTaskInstruction(opts) {
  const instruction = defineInstructions2({ markdown: buildTaskMarkdown(opts) });
  return defineDynamic3({
    events: {
      "session.started": () => instruction
    }
  });
}
function buildTaskDescription(options) {
  const noun = options.workspaceNoun ?? "workspace";
  const capability = options.capabilityNote ? ` ${options.capabilityNote}` : "";
  const blurb = options.modelBlurb ? ` About ${options.modelName}: ${options.modelBlurb}` : "";
  return `Delegate one self-contained subtask to a copy of this agent pinned to ${options.modelName} — same ${noun}, fresh conversation. It cannot ask the user anything: it decides and reports.${capability} ${options.use} Pack the message with everything the child needs (it sees none of your history), name the exact deliverable and the thoroughness you want ("quick", "medium", or "very thorough"), and give parallel children non-overlapping write scopes.${blurb}`;
}
function createTaskAgent(options) {
  const modelOptions = options.modelOptions ?? (typeof options.model === "string" ? visibleReasoningModelOptions(options.model) : undefined);
  return defineAgent({
    description: options.description ?? buildTaskDescription(options),
    model: options.model,
    ...options.modelContextWindowTokens !== undefined ? { modelContextWindowTokens: options.modelContextWindowTokens } : {},
    ...options.reasoning !== undefined ? { reasoning: options.reasoning } : {},
    ...options.build !== undefined ? { build: options.build } : {},
    ...modelOptions !== undefined ? { modelOptions } : {}
  });
}
var GATEWAY_MODELS_URL = "https://ai-gateway.vercel.sh/v1/models";
function isRecord5(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function parseGatewayModelCatalog(value) {
  if (!isRecord5(value) || !Array.isArray(value.data))
    return null;
  const models = [];
  const positiveInt = (raw) => typeof raw === "number" && Number.isInteger(raw) && raw > 0 ? raw : undefined;
  for (const entry of value.data) {
    if (!isRecord5(entry) || typeof entry.id !== "string")
      return null;
    models.push({
      id: entry.id,
      name: typeof entry.name === "string" ? entry.name : undefined,
      description: typeof entry.description === "string" ? entry.description : undefined,
      tags: Array.isArray(entry.tags) && entry.tags.every((tag) => typeof tag === "string") ? entry.tags : undefined,
      contextWindow: positiveInt(entry.context_window),
      maxOutputTokens: positiveInt(entry.max_tokens)
    });
  }
  return models;
}
async function fetchGatewayModelCatalog(options) {
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

// ../../../../../tmp/agent-sdk-mirror-rfUtjW/repo/src/index.ts
function createSandboxFileTools(options) {
  const noun = options.workspaceNoun ?? "workspace";
  const workspace2 = createWorkspace(options.workspaceRoot);
  const io = sandboxIoProvider({
    root: workspace2.root,
    ...options.resolveSession !== undefined ? { resolveSession: options.resolveSession } : {}
  });
  const runner = sandboxRunnerProvider({
    root: workspace2.root,
    ...options.resolveSession !== undefined ? { resolveSession: options.resolveSession } : {},
    spillDir: options.spillDir
  });
  const registry = createTaskRegistry({
    storePath: options.taskStorePath ?? join7(tmpdir(), "agent-sdk", `sandbox-tasks-${process.pid}.json`)
  });
  const backgroundables = [createBashOp(runner)];
  const conventionsFileName = options.conventionsFileName ?? "AGENTS.md";
  const dirConventions = options.injectDirConventions ?? true ? {
    tracker: createDirConventionsTracker({
      workspaceRoot: workspace2.root,
      fileName: conventionsFileName
    }),
    fileName: conventionsFileName
  } : undefined;
  const oracle = options.mediaOracle !== undefined ? resolveMediaOracle(options.mediaOracle) : null;
  const readImageHint = oracle ? lookReadImageHint(oracle) : undefined;
  const readMediaHint = oracle ? lookReadMediaHint(oracle) : undefined;
  const readOversizeHint = oracle ? lookOversizeHint(oracle) : undefined;
  const fetchedImageHint = oracle ? lookFetchedImageHint(oracle) : undefined;
  const fetchedMediaHint = oracle ? lookFetchedMediaHint(oracle) : undefined;
  return {
    workspace: workspace2,
    io,
    runner,
    registry,
    backgroundables,
    mediaOracle: oracle,
    tools: {
      read: createReadTool({
        workspace: workspace2,
        noun,
        io,
        dirConventions,
        ...readImageHint !== undefined ? { imageUnavailableHint: readImageHint } : {},
        ...readMediaHint !== undefined ? { mediaUnavailableHint: readMediaHint } : {},
        ...readOversizeHint !== undefined ? { oversizeHint: readOversizeHint } : {}
      }),
      edit: createEditTool({ workspace: workspace2, noun, io }),
      write: createWriteTool({ workspace: workspace2, noun, io }),
      glob: createGlobTool({ workspace: workspace2, noun, io }),
      grep: createGrepTool({
        workspace: workspace2,
        noun,
        io,
        ...options.spillDir !== undefined ? { spillDir: options.spillDir } : {}
      }),
      bash: createBashTool({
        workdir: workspace2.root,
        runner,
        registry,
        noun,
        interactiveHint: options.bashInteractiveHint,
        execEnv: "sandbox"
      }),
      tasks: createTasksTools({ registry, backgroundables }),
      todo: createTodoTool(),
      webfetch: createWebFetchTool({
        workspace: workspace2,
        ...fetchedImageHint !== undefined ? { imageUnavailableHint: fetchedImageHint } : {},
        ...fetchedMediaHint !== undefined ? { mediaUnavailableHint: fetchedMediaHint } : {}
      }),
      ...oracle !== null ? { look: createLookTool({ workspace: workspace2, noun, oracle, io }) } : {}
    },
    instructions: {
      stack: createInstructionStackInstruction({
        tier: options.instructionTier,
        workspaceNoun: noun,
        verifyCommandHint: options.verifyCommandHint,
        subagentRoster: options.subagentRoster,
        media: oracle ? {
          modelName: oracle.modelName,
          capabilities: oracle.capabilities,
          parentCapabilities: options.parentCapabilities
        } : undefined,
        omitSections: options.omitInstructionSections,
        extraSections: options.extraInstructionSections
      }),
      parallelTools: createParallelToolsInstruction({ tier: options.instructionTier }),
      subagents: createSubagentInstruction({
        workspaceNoun: noun,
        roster: options.subagentRoster,
        tier: options.instructionTier
      }),
      ...oracle !== null ? {
        media: createLookInstruction({
          modelName: oracle.modelName,
          capabilities: oracle.capabilities,
          parentCapabilities: options.parentCapabilities,
          tier: options.instructionTier
        })
      } : {},
      workflow: createWorkflowInstruction({
        workspaceNoun: noun,
        verifyCommandHint: options.verifyCommandHint,
        tier: options.instructionTier
      }),
      planning: createPlanningInstruction({ tier: options.instructionTier }),
      communication: createCommunicationInstruction({ tier: options.instructionTier }),
      hitl: createHitlInstruction({ tier: options.instructionTier })
    }
  };
}
export {
  xhtmlToText,
  workflowSection,
  walkFiles,
  visibleReasoningModelOptions,
  videoMediaType,
  validateTodoWrite,
  toolAuthoringSection,
  subagentSection,
  splitBom,
  slideParagraphs,
  shellSingleQuote,
  searchLocal,
  sandboxRunnerProvider,
  sandboxIoProvider,
  resolveWithin,
  resolveWebFetchTimeoutMs,
  resolveMediaOracle,
  repoConventionsSection,
  replaceForgiving,
  renderWebText,
  renderTruncationMarker,
  renderPromptSections,
  renderPromptSection,
  relativizeWithin,
  readTextForSearch,
  planningSection,
  parseTodoListResult,
  parseTodoItems,
  parseSearchOutput,
  parseGatewayModelCatalog,
  parallelToolsSection,
  openZip,
  modelFamily,
  looksLikeHtml,
  lookSection,
  lookReadMediaHint,
  lookReadImageHint,
  lookOversizeHint,
  lookFetchedMediaHint,
  lookFetchedImageHint,
  lookAvKindClause,
  localIoProvider,
  loadFileContent,
  listGitFiles,
  joinBom,
  isHtmlContentType,
  isDisproportionateMatch,
  imageMediaType,
  hitlSection,
  globToRegExp,
  formatTodoViolations,
  fetchWebResource,
  fetchGatewayModelCatalog,
  extractTextFromHtml,
  extractSheets,
  extractSearchExit,
  extractRtf,
  extractPptx,
  extractPdf,
  extractOdt,
  extractOdp,
  extractNotebook,
  extractEpub,
  extractDocx,
  expectedTaskToolNames,
  editNotFoundHint,
  dirChain,
  detectFileKind,
  describeCapabilities,
  defineOp,
  createWriteTool,
  createWorkspace,
  createWorkflowInstruction,
  createWebFetchTool,
  createToolAuthoringInstruction,
  createTodoTool,
  createTasksTools,
  createTaskRegistry,
  createTaskInstruction,
  createTaskAgent,
  createSubagentInstruction,
  createStatCache,
  createSandboxRunner,
  createSandboxIo,
  createSandboxFileTools,
  createRepoConventionsInstruction,
  createReadTool,
  createPlanningInstruction,
  createParallelToolsInstruction,
  createLookTool,
  createLookInstruction,
  createLocalIo,
  createInstructionStackInstruction,
  createHitlInstruction,
  createGrepTool,
  createGlobTool,
  createEditTool,
  createDirConventionsTracker,
  createCommunicationInstruction,
  createCommandRunner,
  createBoundedCapture,
  createBashTool,
  createBashOp,
  convertHtmlToMarkdown,
  composePromptSections,
  communicationSection,
  capturePreview,
  capabilitiesFromCatalogEntry,
  capabilitiesForModel,
  buildWorkflowMarkdown,
  buildWebFetchHeaders,
  buildToolAuthoringMarkdown,
  buildTasksToolset,
  buildTaskMarkdown,
  buildTaskDescription,
  buildSubagentMarkdown,
  buildRepoConventionsMarkdown,
  buildPlanningMarkdown,
  buildParallelToolsMarkdown,
  buildLookMarkdown,
  buildInstructionStackSections,
  buildInstructionStackMarkdown,
  buildHitlMarkdown,
  buildFileView,
  buildCommunicationMarkdown,
  audioMediaType,
  assertHttpUrl,
  __resetTaskRegistryCacheForTests,
  __resetDirConventionsCacheForTests,
  WhitespaceNormalizedReplacer,
  WEB_FETCH_PDF_DEFAULT_TIMEOUT_SECONDS,
  WEB_FETCH_MAX_TIMEOUT_SECONDS,
  WEB_FETCH_MAX_RESPONSE_BYTES,
  WEB_FETCH_DEFAULT_TIMEOUT_SECONDS,
  TrimmedBoundaryReplacer,
  TOOL_OUTPUT_DIRNAME,
  TODO_STATUSES,
  TODO_PRIORITIES,
  TODO_DISCIPLINE_RIDER,
  TEXT_ONLY_CAPABILITIES,
  TASK_DISABLED_BUILTINS,
  TAIL_CHARS,
  SimpleReplacer,
  STDLIB_EXTERNAL_DEPENDENCIES,
  SHEET_ROW_CAP,
  SEARCH_OUTPUT_CAP_BYTES,
  READ_FILE_MAX_LINE_CHARS,
  READ_FILE_MAX_CONTENT_CHARS,
  READ_FILE_MAX_BYTES,
  READ_FILE_DEFAULT_LINE_LIMIT,
  PPTX_SLIDE_CAP,
  PPTX_EMPTY_SLIDE_NOTE,
  PDF_PAGE_CAP,
  PDF_EMPTY_PAGE_NOTE,
  ODP_EMPTY_SLIDE_NOTE,
  MultiOccurrenceReplacer,
  MEDIA_CAPABILITY_OVERLAY,
  MAX_SPILL_RETAIN_CHARS,
  MAX_SEARCH_FILE_BYTES,
  MAX_PREVIEW,
  LineTrimmedReplacer,
  LOOK_MAX_ANSWER_CHARS,
  IndentationFlexibleReplacer,
  INSTRUCTION_STACK_SECTION_IDS,
  HEAD_CHARS,
  GATEWAY_MODELS_URL,
  FALLBACK_USER_AGENT,
  EscapeNormalizedReplacer,
  EditNotUniqueError,
  EditNotFoundError,
  EditDisproportionateError,
  EPUB_SECTION_CAP,
  DEFAULT_MEDIA_ORACLE,
  DEFAULT_MAX_INLINE_CONTENT_CHARS,
  DEFAULT_LOOK_TIMEOUT_MS,
  DEFAULT_LOOK_MAX_INPUT_BYTES,
  ContextAwareReplacer,
  BlockAnchorReplacer,
  BROWSER_USER_AGENT,
  ALWAYS_IGNORED
};
