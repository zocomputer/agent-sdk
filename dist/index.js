// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/index.ts
import { join as join8 } from "node:path";

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/attachments.ts
var CHAT_ATTACHMENT_FIELD = "chatAttachment";
var DEFAULT_MAX_INLINE_IMAGE_BYTES = 3 * 1024 * 1024;
var DEFAULT_MAX_INLINE_MEDIA_BYTES = 10 * 1024 * 1024;
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function readChatAttachment(toolOutput) {
  if (!isRecord(toolOutput))
    return null;
  const raw = toolOutput[CHAT_ATTACHMENT_FIELD];
  if (!isRecord(raw))
    return null;
  if (typeof raw.dataUrl !== "string" || raw.dataUrl.length === 0)
    return null;
  if (typeof raw.mediaType !== "string" || raw.mediaType.length === 0)
    return null;
  const base = {
    dataUrl: raw.dataUrl,
    mediaType: raw.mediaType
  };
  switch (raw.kind) {
    case "image":
      return {
        kind: "image",
        ...base,
        filename: typeof raw.filename === "string" ? raw.filename : "image",
        width: typeof raw.width === "number" ? raw.width : null,
        height: typeof raw.height === "number" ? raw.height : null
      };
    case "video":
      return {
        kind: "video",
        ...base,
        filename: typeof raw.filename === "string" ? raw.filename : "video"
      };
    case "audio":
      return {
        kind: "audio",
        ...base,
        filename: typeof raw.filename === "string" ? raw.filename : "audio"
      };
    default:
      return null;
  }
}

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/async-tasks.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isTask(value) {
  if (!isRecord2(value))
    return false;
  if (typeof value.id !== "string" || typeof value.tool !== "string" || typeof value.label !== "string" || typeof value.startedAt !== "number" || typeof value.status !== "string") {
    return false;
  }
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
  function listTasks() {
    return [...tasks.values()].sort((a, b) => a.startedAt - b.startedAt);
  }
  function persist() {
    mkdirSync(dirname(storePath), { recursive: true });
    writeFileSync(storePath, JSON.stringify({ tasks: listTasks() }, null, 2), "utf8");
  }
  function readStoreTasks() {
    if (!existsSync(storePath))
      return [];
    try {
      const parsed = JSON.parse(readFileSync(storePath, "utf8"));
      if (!isRecord2(parsed) || !Array.isArray(parsed.tasks))
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
  function spawnTask(tool, label, work) {
    const id = `task_${++counter}`;
    const startedAt = Date.now();
    tasks.set(id, { id, tool, label, startedAt, status: "running" });
    pending.set(id, work);
    work.then((result) => {
      tasks.set(id, {
        id,
        tool,
        label,
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
    async awaitTask(id, waitMs) {
      const current = tasks.get(id);
      if (current) {
        if (current.status !== "running")
          return current;
        const work = pending.get(id);
        if (work) {
          await Promise.race([
            work.then(() => {
              return;
            }, () => {
              return;
            }),
            new Promise((resolve) => setTimeout(resolve, waitMs))
          ]);
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
        await new Promise((resolve) => setTimeout(resolve, Math.min(STORE_POLL_MS, remaining)));
      }
    }
  };
}

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/backgroundable.ts
import { z } from "zod";
function defineOp(cfg) {
  return {
    name: cfg.name,
    description: cfg.description,
    inputJsonSchema: z.toJSONSchema(cfg.inputSchema),
    start(rawInput, extras) {
      const parsed = cfg.inputSchema.safeParse(rawInput);
      if (!parsed.success) {
        throw new Error(`Invalid input for "${cfg.name}": ${parsed.error.message}`);
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
      const running = runner.startCommand(command, {
        cwd,
        timeoutMs: timeout_ms ?? 600000,
        onOutput: extras?.onOutput
      });
      return { work: running.result, progress: running.progress };
    }
  });
}

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/bounded-output.ts
import { appendFileSync, mkdirSync as mkdirSync2, writeFileSync as writeFileSync2 } from "node:fs";
import { dirname as dirname2 } from "node:path";
var HEAD_CHARS = 25000;
var TAIL_CHARS = 25000;
var TOOL_OUTPUT_DIRNAME = "tool-outputs";
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
        mkdirSync2(dirname2(opts.spillPath), { recursive: true });
        writeFileSync2(opts.spillPath, text);
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
        return { text: head, totalChars: total, truncated: false, spillPath: null };
      }
      if (head.length + tail.length === total) {
        return { text: head + tail, totalChars: total, truncated: false, spillPath: null };
      }
      const where = spill === "live" ? `; full output: ${opts.spillLabel ?? opts.spillPath}` : "";
      const marker = `
… [output truncated: showing first ${head.length} and last ${tail.length} of ${total} chars${where}]
`;
      return {
        text: `${head}${marker}${tail}`,
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

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/dir-conventions.ts
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

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/instructions.ts
import { readFileSync as readFileSync3 } from "node:fs";
import { resolve } from "node:path";
import { defineDynamic, defineInstructions } from "eve/instructions";
function buildRepoConventionsMarkdown(workspaceRoot) {
  let agents = "";
  try {
    agents = readFileSync3(resolve(workspaceRoot, "AGENTS.md"), "utf8").trim();
  } catch {}
  if (!agents)
    return "";
  return `## Repository conventions (root AGENTS.md)

These repo-wide conventions always apply. Nested directories add their own \`AGENTS.md\` — read those for the code you touch.

<root-agents-md>
${agents}
</root-agents-md>`;
}
function createRepoConventionsInstruction(opts) {
  const { workspaceRoot } = opts;
  return defineDynamic({
    events: {
      "session.started": () => defineInstructions({ markdown: buildRepoConventionsMarkdown(workspaceRoot) })
    }
  });
}
function createParallelToolsInstruction() {
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
- When you do poll on wall-clock time (waiting on CI, a review, a deploy), keep any single blocking call under ~4 minutes — one sleep+check per call, not a whole retry loop in one call. Provider prompt caches expire after ~5 minutes of model inactivity, so one long silent call re-prices your entire context on the next step; returning between polls keeps it warm.
- Background task metadata and completed results persist across agent restarts. A task still running during a restart is reported as \`lost\`; start it again if its result still matters.
- Before finishing your turn, make sure any background task whose result matters has been awaited — don't end while relevant work is still running. If you're unsure what's still in flight, call \`check_tasks\`. A task you set a \`notify\` watcher on may keep running — its matches will reach you as messages.`
  });
  return defineDynamic({
    events: {
      "session.started": () => instruction
    }
  });
}
function buildWorkflowMarkdown(opts) {
  const noun = opts?.workspaceNoun ?? "workspace";
  const verify = opts?.verifyCommandHint ? ` (e.g. \`${opts.verifyCommandHint}\`)` : "";
  return `## How to work

1. **Explore before you edit.** Find the relevant code with \`glob\`/\`grep\` and \`read\` it — match the ${noun}'s existing patterns instead of guessing.
2. **Read a file before editing it**, so your edits target the current text. Prefer \`edit\` for targeted changes; use \`write\` for new files or full rewrites.
3. **Follow the surrounding conventions.** Match the style, structure, and idioms of the code around your change rather than imposing your own.
4. **Verify your work.** After changing code, run the relevant checks${verify} and fix what you broke. Leave the ${noun} in a working state.
5. **Track multi-step work** with \`todo\`, and keep it current as you finish each step.
6. **Finish the job before ending your turn.** Reread your final message: if it promises work ("I'll…"), lays out next steps you could take now, or asks a question you could answer yourself with a tool call, do that work instead of stopping. End your turn only when the task is complete or you're blocked on something only the user can provide.`;
}
function createWorkflowInstruction(opts) {
  const instruction = defineInstructions({ markdown: buildWorkflowMarkdown(opts) });
  return defineDynamic({
    events: {
      "session.started": () => instruction
    }
  });
}
function buildCommunicationMarkdown() {
  return `## Communicating

- **Lead with the outcome.** The first sentence of your final message answers "what happened" — what changed, what you found, whether it worked. Supporting detail and reasoning come after, for readers who want them.
- **Readable beats brief.** Shorten by dropping detail that doesn't change what the reader does next — not by compressing prose into fragments, arrow chains, or bare jargon. Write complete sentences and name the specific thing (the actual file, function, or command), not "the relevant helper".
- **Report, don't fix, when the user is diagnosing.** If they're describing a problem or asking a question, the deliverable is your assessment: investigate and report. Apply a fix only when they ask for one.
- **Act within scope without asking.** For reversible actions that follow from the task, decide and proceed — asking "Should I…?" stalls the work. Stop to ask only for destructive or hard-to-reverse actions, or genuine scope changes the user must decide.
- **Report outcomes faithfully.** If a check fails, say so and include the output; if you skipped a step, say that; when something is done and verified, state it plainly without hedging.`;
}
function createCommunicationInstruction() {
  const instruction = defineInstructions({ markdown: buildCommunicationMarkdown() });
  return defineDynamic({
    events: {
      "session.started": () => instruction
    }
  });
}
function buildHitlMarkdown() {
  return `## Asking the user (ask_question)

Call \`ask_question\` only when you're genuinely blocked on a choice that is the user's to make — not for permission to proceed with a reasonable default you can pick yourself. When you do ask:

- **Offer \`options\` when the choices are enumerable** instead of asking open-ended; each option is \`{ id, label, description?, style? }\` and the user answers with one click.
- **Put your recommended option first** and mark it \`style: "primary"\`. Use \`style: "danger"\` for destructive or hard-to-reverse choices.
- **Use each option's \`description\`** for the trade-off the label can't carry.
- **Keep free text open** (\`allowFreeform: true\`) unless the answer must be exactly one of the options.
- **Ask independent questions together**: emit several \`ask_question\` calls in one response — they collect into a single prompt and you get all the answers at once, instead of making the user answer serial round-trips.`;
}
function createHitlInstruction() {
  const instruction = defineInstructions({ markdown: buildHitlMarkdown() });
  return defineDynamic({
    events: {
      "session.started": () => instruction
    }
  });
}
function buildSubagentMarkdown(workspaceNoun = "workspace", roster) {
  const noun = workspaceNoun;
  const rosterSection = roster && roster.length > 0 ? `

### Choosing a subagent

Beyond the clone, you have declared specialists — each is its own tool with the same \`{ message, outputSchema? }\` input:

${roster.map((entry) => `- **\`${entry.name}\`** — ${entry.when}.`).join(`
`)}

Prefer a specialist when its purpose or model tier matches the subtask; use the clone \`agent\` when none fits. A specialist that can edit shares the non-overlapping write-scope rule above; one that cannot write is safe to fan out freely.` : "";
  return `## Delegating with the agent tool

\`agent\` runs a focused subtask in a **fresh copy of yourself** — same tools and instructions, same ${noun}, but a **blank conversation**: the child sees only the \`message\` you send, none of your history. It's how you parallelize.

- **Pack the message with everything the child needs**: the exact deliverable, relevant paths, constraints, and any context it can't discover cheaply. A vague delegation wastes the whole child run.
- **Fan out independent subtasks in parallel**: emit several \`agent\` calls in one response — they run concurrently and all results return before you continue. Fan out only work that's genuinely independent.
- **Give parallel children non-overlapping write scopes** (different files or directories). They share your ${noun} and see each other's writes; overlapping edits clobber.
- **Don't delegate trivia.** A subtask that one or two direct tool calls would answer is faster done yourself; delegation pays off for self-contained work with real depth (multi-file exploration, an isolated fix + verify, a report).
- Set \`outputSchema\` when you need structured output back instead of prose.${rosterSection}`;
}
function createSubagentInstruction(opts) {
  const instruction = defineInstructions({
    markdown: buildSubagentMarkdown(opts?.workspaceNoun, opts?.roster)
  });
  return defineDynamic({
    events: {
      "session.started": () => instruction
    }
  });
}

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/run.ts
import { spawn } from "node:child_process";
import { join as join2 } from "node:path";
var MAX_PREVIEW = 20000;
function previewOf(capture) {
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
      const spillPath = join2(spillDir, `bash-${runId}-${stream}.log`);
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
          stdout: previewOf(stdoutCapture),
          stderr: previewOf(stderrCapture),
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

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/steer-inbox.ts
import {
  appendFileSync as appendFileSync2,
  linkSync,
  mkdirSync as mkdirSync3,
  readFileSync as readFileSync4,
  renameSync,
  rmSync
} from "node:fs";
import { join as join3 } from "node:path";

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/steer.ts
var STEER_FIELD = "user_steer";
var STEER_WRAPPED_OUTPUT_FIELD = "steer_wrapped_output";
var STEER_DIRNAME = "steer";
var STEER_NOTE = "The user sent these messages while this tool was running. They take priority: address them now and adjust your current approach before continuing.";
function buildSteerPayload(messages) {
  return { note: STEER_NOTE, messages: [...messages] };
}
function isRecord3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isSteerMessage(value) {
  return isRecord3(value) && typeof value.id === "string" && typeof value.text === "string" && typeof value.at === "number";
}
function attachSteerToOutput(output, messages) {
  if (isRecord3(output)) {
    const existing = readSteerMessages(output) ?? [];
    return { ...output, [STEER_FIELD]: buildSteerPayload([...existing, ...messages]) };
  }
  return {
    [STEER_WRAPPED_OUTPUT_FIELD]: output,
    [STEER_FIELD]: buildSteerPayload(messages)
  };
}
function stripSteerFromOutput(record) {
  const { [STEER_FIELD]: _steer, ...rest } = record;
  const keys = Object.keys(rest);
  if (keys.length === 1 && keys[0] === STEER_WRAPPED_OUTPUT_FIELD) {
    return rest[STEER_WRAPPED_OUTPUT_FIELD];
  }
  return rest;
}
function readSteerMessages(output) {
  if (!isRecord3(output))
    return null;
  const payload = output[STEER_FIELD];
  if (!isRecord3(payload) || !Array.isArray(payload.messages))
    return null;
  const messages = payload.messages.filter(isSteerMessage);
  return messages.length > 0 ? messages : null;
}
function formatSteerText(messages) {
  const lines = messages.map((message) => `- ${message.text}`);
  return `[${STEER_FIELD}] ${STEER_NOTE}
${lines.join(`
`)}`;
}
function mergeSteerIntoModelOutput(output, messages) {
  if (output.type === "text") {
    return { type: "text", value: `${output.value}

${formatSteerText(messages)}` };
  }
  return { type: "json", value: attachSteerToOutput(output.value, messages) };
}
function serializeSteerLine(message) {
  return JSON.stringify(message);
}
function parseSteerLine(line) {
  const trimmed = line.trim();
  if (trimmed === "")
    return null;
  try {
    const parsed = JSON.parse(trimmed);
    return isSteerMessage(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/steer-inbox.ts
var drainSequence = 0;
function createSteerInbox(options) {
  const now = options.now ?? Date.now;
  const newId = options.newId ?? (() => crypto.randomUUID());
  const readFile = options.readFile ?? ((path) => readFileSync4(path, "utf8"));
  const fileFor = (sessionId) => join3(options.dir, `${encodeURIComponent(sessionId)}.ndjson`);
  function appendMessage(sessionId, message) {
    mkdirSync3(options.dir, { recursive: true });
    appendFileSync2(fileFor(sessionId), `${serializeSteerLine(message)}
`, "utf8");
  }
  return {
    append(sessionId, text) {
      const message = { id: newId(), text, at: now() };
      appendMessage(sessionId, message);
      return message;
    },
    appendMessage,
    drain(sessionId) {
      const file = fileFor(sessionId);
      const claimed = `${file}.drain-${process.pid}-${drainSequence++}`;
      try {
        renameSync(file, claimed);
      } catch {
        return [];
      }
      let raw;
      try {
        raw = readFile(claimed);
      } catch {
        try {
          linkSync(claimed, file);
          rmSync(claimed, { force: true });
        } catch {
          try {
            appendFileSync2(file, readFileSync4(claimed));
            rmSync(claimed, { force: true });
          } catch {}
        }
        return [];
      }
      rmSync(claimed, { force: true });
      return raw.split(`
`).map(parseSteerLine).filter((message) => message !== null);
    }
  };
}

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/steer-tool.ts
import { defineTool } from "eve/tools";
function withSteerDelivery(tool, inbox) {
  const originalToModelOutput = tool.toModelOutput?.bind(tool);
  const wrapped = {
    ...tool,
    async execute(input, ctx) {
      const output = await tool.execute(input, ctx);
      const messages = inbox.drain(ctx.session.id);
      if (messages.length === 0)
        return output;
      return attachSteerToOutput(output, messages);
    },
    ...originalToModelOutput ? {
      async toModelOutput(output) {
        const messages = readSteerMessages(output);
        if (!messages)
          return originalToModelOutput(output);
        const original = stripSteerFromOutput(output);
        const narrowed = await originalToModelOutput(original);
        return mergeSteerIntoModelOutput(narrowed, messages);
      }
    } : {}
  };
  return defineTool(wrapped);
}
function createSteerWrapper(inbox) {
  if (!inbox)
    return (tool) => tool;
  return (tool) => withSteerDelivery(tool, inbox);
}

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/tools/bash.ts
import { defineTool as defineTool2 } from "eve/tools";
import { z as z2 } from "zod";

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/park-delivery.ts
function isRecord4(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function clientContinuationToken(runtimeToken) {
  const sep = runtimeToken.indexOf(":");
  if (sep <= 0)
    return runtimeToken;
  const rest = runtimeToken.slice(sep + 1);
  return rest.includes(":") ? rest : runtimeToken;
}
function createParkDeliveryState() {
  const sessions = new Map;
  function session(id) {
    let state = sessions.get(id);
    if (!state) {
      state = { pending: new Map, delivered: new Set, parked: false, delivering: false };
      sessions.set(id, state);
    }
    return state;
  }
  function drain(id, state) {
    if (state.pending.size === 0 || !state.continuationToken || state.delivering)
      return null;
    const items = [...state.pending.values()];
    state.pending.clear();
    for (const item of items)
      state.delivered.add(item.key);
    state.delivering = true;
    return { sessionId: id, continuationToken: state.continuationToken, items };
  }
  function enqueueAll(sessionId, items) {
    const state = session(sessionId);
    let queued = false;
    for (const item of items) {
      if (state.delivered.has(item.key) || state.pending.has(item.key))
        continue;
      state.pending.set(item.key, item);
      queued = true;
    }
    if (!queued || !state.parked)
      return null;
    return drain(sessionId, state);
  }
  return {
    observe(event, meta) {
      const state = session(meta.sessionId);
      if (meta.continuationToken) {
        state.continuationToken = clientContinuationToken(meta.continuationToken);
      }
      if (!isRecord4(event))
        return null;
      if (event.type === "session.completed" || event.type === "session.failed") {
        sessions.delete(meta.sessionId);
        return null;
      }
      if (event.type !== "session.waiting") {
        state.parked = false;
        return null;
      }
      state.parked = true;
      return drain(meta.sessionId, state);
    },
    enqueue(sessionId, item) {
      return enqueueAll(sessionId, [item]);
    },
    enqueueAll,
    settle(request, ok) {
      const state = session(request.sessionId);
      state.delivering = false;
      if (ok) {
        if (state.parked)
          return drain(request.sessionId, state);
        return null;
      }
      for (const item of request.items) {
        state.delivered.delete(item.key);
        state.pending.set(item.key, item);
      }
      return null;
    }
  };
}
var BRIDGE_KEY = Symbol.for("zocomputer.agent-sdk.park-notification-bridge");
var MAX_QUEUED_PER_SESSION = 20;
function bridge() {
  const holder = globalThis;
  holder[BRIDGE_KEY] ??= { queued: new Map, handler: null };
  return holder[BRIDGE_KEY];
}
function postParkNotification(sessionId, notification) {
  const b = bridge();
  if (b.handler) {
    b.handler(sessionId, notification);
    return;
  }
  const queue = b.queued.get(sessionId) ?? [];
  if (queue.length >= MAX_QUEUED_PER_SESSION)
    return;
  queue.push(notification);
  b.queued.set(sessionId, queue);
}
function setParkNotificationHandler(handler) {
  const b = bridge();
  b.handler = handler;
  const queued = [...b.queued.entries()];
  b.queued.clear();
  for (const [sessionId, notifications] of queued) {
    for (const notification of notifications)
      handler(sessionId, notification);
  }
}

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/watch-output.ts
var DEFAULT_WATCH_DEBOUNCE_MS = 5000;
var DEFAULT_MAX_WATCH_NOTIFICATIONS = 5;
function createOutputWatcher(options) {
  const regex = new RegExp(options.pattern);
  const debounceMs = options.debounceMs ?? DEFAULT_WATCH_DEBOUNCE_MS;
  const maxNotifications = options.maxNotifications ?? DEFAULT_MAX_WATCH_NOTIFICATIONS;
  const now = options.now ?? Date.now;
  let buffer = "";
  let notifications = 0;
  let lastNotifiedAt = null;
  function emit(lines) {
    const matches = lines.filter((line) => regex.test(line));
    if (matches.length === 0)
      return null;
    if (notifications >= maxNotifications)
      return null;
    const at = now();
    if (lastNotifiedAt !== null && at - lastNotifiedAt < debounceMs)
      return null;
    notifications += 1;
    lastNotifiedAt = at;
    return matches;
  }
  return {
    feed(chunk) {
      buffer += chunk;
      const parts = buffer.split(`
`);
      buffer = parts.pop() ?? "";
      return emit(parts);
    },
    flush() {
      if (buffer.length === 0)
        return null;
      const tail = buffer;
      buffer = "";
      const matches = [tail].filter((line) => regex.test(line));
      if (matches.length === 0)
        return null;
      if (notifications >= maxNotifications)
        return null;
      notifications += 1;
      lastNotifiedAt = now();
      return matches;
    }
  };
}
function formatWatchNotification(opts) {
  return `Background task ${opts.taskId} (${opts.label}) — ${opts.reason}. ` + `Output matched your watch pattern:
${opts.lines.join(`
`)}`;
}
function formatCompletionNotification(opts) {
  const outcome = opts.status === "done" ? "finished" : `failed${opts.error ? `: ${opts.error}` : ""}`;
  return `Background task ${opts.taskId} (${opts.label}) ${outcome}. Call await_task to collect its result.`;
}

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/tools/bash.ts
var DEFAULT_INTERACTIVE_HINT = "This is a piped shell with NO tty: avoid interactive or full-screen CLIs (a REPL, vim, an interactive installer/prompt) — those programs hang or degrade without a real terminal.";
function createBashTool(opts) {
  const { workspace, runner, registry, noun } = opts;
  const interactiveHint = opts.interactiveHint ?? DEFAULT_INTERACTIVE_HINT;
  return defineTool2({
    description: `Run a shell command on the host, from the ${noun} root by default. Quick commands return normally. If the command is still running after foreground_ms, it keeps running in the background and returns a task_id plus current stdout/stderr; use check_tasks and await_task to monitor or collect the result. For a long-running command where you only care about a specific output signal (a failure line, a "listening on" banner), pass notify — if the command backgrounds, matching output is delivered to you as a message while you're idle, so you can keep working instead of polling. Use it for git, tests/builds/type-checks, ripgrep, dev servers, and anything the file tools don't cover. Very long output is truncated to its head and tail; the complete output is saved to a file named in the result — grep or read that file instead of re-running the command. This is a real shell on the user's machine with no sandbox and no undo — be careful with destructive commands. ` + interactiveHint,
    inputSchema: z2.object({
      command: z2.string().min(1).describe("The shell command to run."),
      cwd: z2.string().optional().describe(`Working directory, relative to the ${noun} root. Defaults to the ${noun} root.`),
      timeout_ms: z2.number().int().positive().optional().describe("Kill the command after this many milliseconds (default 600000)."),
      foreground_ms: z2.number().int().positive().optional().describe("How long to wait before returning a background task handle (default 2000)."),
      notify: z2.object({
        pattern: z2.string().min(1).describe("Regex matched against complete output lines (stdout and stderr)."),
        reason: z2.string().min(1).describe("Short phrase naming what you're watching for, e.g. 'test failures'."),
        debounce_ms: z2.number().int().positive().optional().describe("Minimum ms between match notifications (default 5000).")
      }).optional().describe("Watch the command's output if it backgrounds: matching lines are delivered to you as a message while you're idle. No effect on a command that completes in the foreground.")
    }),
    async execute({ command, cwd, timeout_ms, foreground_ms, notify }, ctx) {
      const watcher = notify ? createOutputWatcher({ pattern: notify.pattern, debounceMs: notify.debounce_ms }) : null;
      let feedLive = null;
      const buffered = [];
      const running = runner.startCommand(command, {
        cwd,
        timeoutMs: timeout_ms ?? 600000,
        onOutput: watcher ? (chunk) => {
          if (feedLive)
            feedLive(chunk);
          else
            buffered.push(chunk);
        } : undefined
      });
      const result = await Promise.race([
        running.result,
        new Promise((resolve2) => setTimeout(() => resolve2(null), foreground_ms ?? 2000))
      ]);
      if (result !== null) {
        return {
          workdir: workspace.root,
          mode: "completed",
          exitCode: result.exitCode,
          timedOut: result.timedOut,
          stdout: result.stdout,
          stderr: result.stderr
        };
      }
      const taskId = registry.spawnTask("bash", command, running.result);
      registry.updateTaskProgress(taskId, running.progress());
      const interval = setInterval(() => registry.updateTaskProgress(taskId, running.progress()), 500);
      running.result.finally(() => clearInterval(interval)).catch(() => {
        return;
      });
      if (watcher && notify) {
        const sessionId = ctx?.session?.id;
        let matchCount = 0;
        const post = (lines) => {
          if (!lines || !sessionId)
            return;
          matchCount += 1;
          postParkNotification(sessionId, {
            key: `${taskId}#watch${matchCount}`,
            text: formatWatchNotification({ taskId, label: command, reason: notify.reason, lines })
          });
        };
        feedLive = (chunk) => post(watcher.feed(chunk));
        for (const chunk of buffered.splice(0))
          feedLive(chunk);
        running.result.finally(() => post(watcher.flush())).catch(() => {
          return;
        });
      }
      return {
        workdir: workspace.root,
        mode: "backgrounded",
        task_id: taskId,
        status: "running",
        progress: running.progress(),
        ...watcher ? {
          watching: notify?.pattern,
          note: "Command is still running in the background; matching output will be delivered to you as a message while you're idle. Continue independent work, or call await_task if your next step needs the result."
        } : {
          note: "Command is still running in the background. Continue independent work, then call check_tasks for live output or await_task when you need the final result."
        }
      };
    }
  });
}

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/tools/edit.ts
import { defineTool as defineTool3 } from "eve/tools";
import { z as z3 } from "zod";

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/path-locks.ts
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

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/workspace-io.ts
import { mkdirSync as mkdirSync4, readFileSync as readFileSync7, statSync as statSync2, writeFileSync as writeFileSync3 } from "node:fs";
import { dirname as dirname3, join as join5 } from "node:path";

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/glob-match.ts
function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const body = escaped.replace(/\*\*\/?/g, "\x00").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]").replace(/\u0000/g, "(?:.*/)?");
  return new RegExp(`^${body}$`);
}

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/list-files.ts
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

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/read-text.ts
import { readFileSync as readFileSync5, statSync } from "node:fs";
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
    buf = readFileSync5(abs);
  } catch {
    return { kind: "unreadable" };
  }
  if (buf.subarray(0, BINARY_SNIFF_BYTES).includes(0))
    return { kind: "binary" };
  return { kind: "text", content: buf.toString("utf8") };
}

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/walk.ts
import { readFileSync as readFileSync6, readdirSync } from "node:fs";
import { join as join4, relative, sep } from "node:path";
import ignore from "ignore";
var ALWAYS_IGNORED = new Set([".git", ".jj", ".hg", ".svn", "node_modules"]);
function loadGitignore(absDir, prefix) {
  let text;
  try {
    text = readFileSync6(join4(absDir, ".gitignore"), "utf8");
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
      absDir = join4(absDir, segment);
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
        stack.push({ dir: join4(frame.dir, entry.name), rel, scopes: active });
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

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/workspace.ts
import { isAbsolute, relative as relative2, resolve as resolve2, sep as sep2 } from "node:path";
function resolveWithin(root, path) {
  const abs = isAbsolute(path) ? resolve2(path) : resolve2(root, path);
  if (abs !== root && !abs.startsWith(root + sep2)) {
    throw new Error(`Path escapes the workspace root (${root}): ${path}`);
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

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/workspace-io.ts
function createLocalIo(root) {
  return {
    async stat(abs) {
      try {
        const st = statSync2(abs);
        return { isFile: st.isFile(), size: st.size, mtimeMs: st.mtimeMs };
      } catch {
        return null;
      }
    },
    async readFile(abs) {
      try {
        return readFileSync7(abs);
      } catch (err) {
        if (isMissingFileError(err))
          return null;
        throw err;
      }
    },
    async writeFile(abs, content) {
      mkdirSync4(dirname3(abs), { recursive: true });
      writeFileSync3(abs, content);
    },
    async listFiles(scope) {
      if (scope === undefined) {
        return listGitFiles(root) ?? walkFiles(root);
      }
      const rel = relativizeWithin(root, scope);
      return listGitFiles(root, rel) ?? walkFiles(scope, root);
    },
    async search(options) {
      return searchLocal(root, options);
    }
  };
}
function localIoProvider(root) {
  const io = createLocalIo(root);
  return () => io;
}
function isMissingFileError(err) {
  return typeof err === "object" && err !== null && "code" in err && err.code === "ENOENT";
}
async function searchLocal(root, options) {
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
  scan:
    for (const file of candidates) {
      if (globRe && !globRe.test(file))
        continue;
      const read = readTextForSearch(join5(root, file));
      if (read.kind === "too-large") {
        skippedLargeFiles += 1;
        continue;
      }
      if (read.kind !== "text")
        continue;
      const lines = read.content.split(`
`);
      for (const [index, line] of lines.entries()) {
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

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/tools/edit.ts
function createEditTool(opts) {
  const { workspace, noun } = opts;
  const io = opts.io ?? localIoProvider(workspace.root);
  return defineTool3({
    description: "Replace an exact string in an existing file. By default old_string must occur exactly once — include enough surrounding context to make it unique. Set replace_all to replace every occurrence (e.g. renaming a symbol).",
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
        const bytes = await fio.readFile(abs);
        if (bytes === null)
          throw new Error(`${rel} does not exist.`);
        const before = bytes.toString("utf8");
        const count = before.split(old_string).length - 1;
        if (count === 0)
          throw new Error(`old_string not found in ${rel}.`);
        if (count > 1 && !replace_all) {
          throw new Error(`old_string is not unique in ${rel} (${count} matches). Add surrounding context or set replace_all.`);
        }
        const after = before.split(old_string).join(new_string);
        await fio.writeFile(abs, after);
        return { ok: true, path: rel, replacements: count };
      });
    }
  });
}

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/tools/glob.ts
import { defineTool as defineTool4 } from "eve/tools";
import { z as z4 } from "zod";
function createGlobTool(opts) {
  const { workspace, noun } = opts;
  const io = opts.io ?? localIoProvider(workspace.root);
  return defineTool4({
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

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/tools/grep.ts
import { defineTool as defineTool5 } from "eve/tools";
import { z as z5 } from "zod";
import { join as join6 } from "node:path";
var GREP_SPILL_MAX_MATCHES = 5000;
var MATCH_TEXT_MAX_CHARS = 300;
function createGrepTool(opts) {
  const { workspace, noun, spillDir } = opts;
  const io = opts.io ?? localIoProvider(workspace.root);
  return defineTool5({
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
        const spillPath = join6(spillDir, `grep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.txt`);
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

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/tools/read.ts
import { defineTool as defineTool6 } from "eve/tools";
import { z as z6 } from "zod";
import { basename } from "node:path";

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/file-kind.ts
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
      return { kind: "binary", description: "a PowerPoint deck (.pptx) with no text extractor" };
    case ".odt":
      return {
        kind: "binary",
        description: "an OpenDocument text file (.odt) with no text extractor"
      };
    case ".epub":
      return { kind: "binary", description: "an EPUB e-book with no text extractor" };
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
  if (startsWith(buf, UTF16LE_BOM))
    return { kind: "text", encoding: "utf16le" };
  if (startsWith(buf, UTF16BE_BOM))
    return { kind: "text", encoding: "utf16be" };
  if (buf.subarray(0, BINARY_SNIFF_BYTES2).includes(0)) {
    return { kind: "binary", description: "binary data (unrecognized format)" };
  }
  return { kind: "text", encoding: "utf8" };
}

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/file-view.ts
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

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/read-file-content.ts
import { imageSize } from "image-size";

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/extract/cache.ts
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

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/extract/docx.ts
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

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/extract/pdf.ts
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

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/extract/sheet.ts
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

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/read-file-content.ts
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
    case "sheet":
      return extractionCache.get(path, id, () => extractDocument(detected, buffer, path));
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

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/tools/read.ts
function buildMediaHint(attach, verb) {
  const kinds = ["image", "video", "audio"];
  const on = kinds.filter((kind) => attach[kind]);
  const off = kinds.filter((kind) => !attach[kind]);
  const list = (items) => items.join(" or ");
  if (on.length === 0) {
    return `${verb} media (images, video, audio) returns metadata only`;
  }
  const queued = `${verb} ${list(on)} files returns metadata and queues the file to appear as a viewable attachment on your next message`;
  return off.length === 0 ? queued : `${queued} (${list(off)} ${verb === "reading" ? "reads" : "fetches"} return metadata only)`;
}
function createReadTool(opts) {
  const { workspace, noun, attachImagesToChat, maxInlineImageBytes, dirConventions } = opts;
  const io = opts.io ?? localIoProvider(workspace.root);
  const attachVideoToChat = opts.attachVideoToChat ?? false;
  const attachAudioToChat = opts.attachAudioToChat ?? false;
  const maxInlineMediaBytes = opts.maxInlineMediaBytes ?? DEFAULT_MAX_INLINE_MEDIA_BYTES;
  const oversizeHint = opts.oversizeHint ?? "Use bash (head, sed -n, rg) to extract the part you need.";
  const imageUnavailableHint = opts.imageUnavailableHint ?? "If you need to see this image, ask the user to attach it to the chat.";
  const mediaUnavailableHint = opts.mediaUnavailableHint ?? "If you need its contents, extract what you can with bash (e.g. ffmpeg frames from a video, read as images) or ask the user about it.";
  const conventionsHint = dirConventions ? ` When a read first enters a directory with its own ${dirConventions.fileName} conventions file, the result includes it under directory_conventions (once per directory per session) — honor those conventions for work in that directory.` : "";
  const mediaHint = buildMediaHint({ image: attachImagesToChat, video: attachVideoToChat, audio: attachAudioToChat }, "reading");
  const editHint = opts.includeEditGuidance ?? true ? " Read a file before editing it so your edits target the current text." : "";
  return defineTool6({
    description: `Read a file from the ${noun}, returning line-numbered text. PDF, DOCX, and spreadsheet files (.xlsx, .xlsm, .xls, .ods) are converted to plain text (PDFs get per-page markers, spreadsheets render as TSV per sheet); ${mediaHint}.${editHint} Returns up to 2000 lines per call by default; page bigger files with offset/limit.` + conventionsHint,
    inputSchema: z6.object({
      path: z6.string().min(1).describe(`File path, relative to the ${noun} root.`),
      offset: z6.number().int().positive().optional().describe("1-based line to start reading from."),
      limit: z6.number().int().positive().optional().describe("Max number of lines to return.")
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
          if (!attachImagesToChat || stat.size > maxInlineImageBytes) {
            const why = attachImagesToChat && stat.size > maxInlineImageBytes ? `too large to attach automatically (${stat.size} bytes, max ${maxInlineImageBytes})` : "cannot be returned as a tool result (text/json only), and image attachments are not enabled for this agent";
            return {
              ...meta,
              note: `Image content ${why}. ${imageUnavailableHint}`,
              ...conventions
            };
          }
          const attachment = {
            kind: "image",
            dataUrl: `data:${imageMediaType(content.format)};base64,${buffer.toString("base64")}`,
            mediaType: imageMediaType(content.format),
            filename: basename(rel),
            width: content.width,
            height: content.height
          };
          return {
            ...meta,
            note: "This image is queued and will be attached to your next message as a viewable image — no need to ask the user to attach it.",
            [CHAT_ATTACHMENT_FIELD]: attachment,
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
          const label = kind === "video" ? "Video" : "Audio";
          const enabled = kind === "video" ? attachVideoToChat : attachAudioToChat;
          if (!enabled || stat.size > maxInlineMediaBytes) {
            const why = enabled && stat.size > maxInlineMediaBytes ? `too large to attach automatically (${stat.size} bytes, max ${maxInlineMediaBytes})` : `cannot be returned as a tool result (text/json only), and ${kind} attachments are not enabled for this agent`;
            return {
              ...meta,
              note: `${label} content ${why}. ${mediaUnavailableHint}`,
              ...conventions
            };
          }
          const attachment = {
            kind,
            dataUrl: `data:${mediaType};base64,${buffer.toString("base64")}`,
            mediaType,
            filename: basename(rel)
          };
          return {
            ...meta,
            note: `This ${kind} file is queued and will be attached to your next message — no need to ask the user to attach it.`,
            [CHAT_ATTACHMENT_FIELD]: attachment,
            ...conventions
          };
        }
      }
    },
    toModelOutput(output) {
      if (typeof output === "object" && output !== null && CHAT_ATTACHMENT_FIELD in output) {
        const { [CHAT_ATTACHMENT_FIELD]: _omitted, ...rest } = output;
        return { type: "json", value: rest };
      }
      return { type: "json", value: output };
    }
  });
}

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/tools/tasks.ts
import { defineDynamic as defineDynamic2, defineTool as defineTool7 } from "eve/tools";
import { z as z7 } from "zod";
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
  const wrap = createSteerWrapper(opts.steerInbox ?? null);
  return {
    run_async: wrap(defineTool7({
      description: `Start a tool running in the BACKGROUND and return immediately with a task id, instead of blocking until it finishes. Use it for long work whose result your next step doesn't need yet (tests, builds, installs) so you can keep working in parallel; poll with check_tasks and collect the result with await_task. If your very next step needs the output, just call the tool directly instead. For work where you only care about a specific output signal, pass notify — matching lines are delivered to you as a message while you're idle, instead of you polling.

Backgroundable tools (pass \`input\` matching the tool's own schema):
` + catalog,
      inputSchema: z7.object({
        tool: z7.enum(toolNames).describe("Which backgroundable tool to run."),
        input: z7.record(z7.string(), z7.unknown()).describe("Arguments for that tool — the same object you'd pass calling it directly."),
        notify: z7.object({
          pattern: z7.string().min(1).describe("Regex matched against complete output lines."),
          reason: z7.string().min(1).describe("Short phrase naming what you're watching for, e.g. 'build errors'."),
          debounce_ms: z7.number().int().positive().optional().describe("Minimum ms between match notifications (default 5000).")
        }).optional().describe("Watch the task's output: matching lines are delivered to you as a message while you're idle."),
        notify_on_complete: z7.boolean().optional().describe("Also deliver a message when the task settles (default false; await_task remains the primary way to collect results).")
      }),
      execute({ tool, input, notify, notify_on_complete }, ctx) {
        const op = backgroundables.find((o) => o.name === tool);
        if (!op)
          throw new Error(`Unknown backgroundable tool: ${tool}`);
        const sessionId = ctx?.session?.id;
        const watcher = notify ? createOutputWatcher({ pattern: notify.pattern, debounceMs: notify.debounce_ms }) : null;
        let post = null;
        const early = [];
        const { label, work, progress } = op.start(input, watcher ? {
          onOutput: (chunk) => {
            const matches = watcher.feed(chunk);
            if (!matches)
              return;
            if (post)
              post(matches);
            else
              early.push(matches);
          }
        } : undefined);
        const taskId = registry.spawnTask(tool, label, work);
        if (watcher && notify && sessionId) {
          let matchCount = 0;
          post = (lines) => {
            if (!lines || lines.length === 0)
              return;
            matchCount += 1;
            postParkNotification(sessionId, {
              key: `${taskId}#watch${matchCount}`,
              text: formatWatchNotification({ taskId, label, reason: notify.reason, lines })
            });
          };
          for (const batch of early.splice(0))
            post(batch);
          work.finally(() => post?.(watcher.flush())).catch(() => {
            return;
          });
        }
        if (notify_on_complete && sessionId) {
          work.then(() => postParkNotification(sessionId, {
            key: `${taskId}#done`,
            text: formatCompletionNotification({ taskId, label, status: "done" })
          }), (err) => postParkNotification(sessionId, {
            key: `${taskId}#done`,
            text: formatCompletionNotification({
              taskId,
              label,
              status: "error",
              error: err instanceof Error ? err.message : String(err)
            })
          }));
        }
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
          ...watcher ? { watching: notify?.pattern } : {},
          note: "Started in the background. If your next actions don't depend on this, keep working and call check_tasks / await_task later; otherwise call await_task now."
        };
      }
    })),
    check_tasks: wrap(defineTool7({
      description: "List background tasks and their status without blocking; returns `runningCount` plus the task list. For tasks that support progress (notably bash), includes a live stdout/stderr preview. Call await_task to collect a task's final result.",
      inputSchema: z7.object({}),
      execute() {
        const tasks = registry.listTasks().map(peek);
        return { runningCount: tasks.filter((t) => t.status === "running").length, tasks };
      }
    })),
    await_task: wrap(defineTool7({
      description: "Block until a background task finishes (up to wait_ms), then return its full result. Use it when your next step needs the task's final output. If the wait elapses while it's still running, returns the running status plus any live progress so you can decide to keep waiting or move on.",
      inputSchema: z7.object({
        task_id: z7.string().min(1).describe("Task id returned by run_async or a backgrounded bash call."),
        wait_ms: z7.number().int().positive().optional().describe(`Max time to block in ms (default ${DEFAULT_WAIT_MS}).`)
      }),
      async execute({ task_id, wait_ms }) {
        const task = await registry.awaitTask(task_id, wait_ms ?? DEFAULT_WAIT_MS);
        if (!task)
          throw new Error(`No such task: ${task_id}`);
        return full(task);
      }
    }))
  };
}
function createTasksTools(opts) {
  return defineDynamic2({
    events: {
      "session.started": () => buildTasksToolset(opts)
    }
  });
}

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/tools/webfetch.ts
import { defineTool as defineTool8 } from "eve/tools";
import { z as z8 } from "zod";
import { basename as basename2, join as join7 } from "node:path";

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/web-fetch.ts
import { Parser } from "htmlparser2";
import { parseHTML as parseHTML2 } from "linkedom";
import TurndownService from "turndown";

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/web-page.ts
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

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/web-fetch.ts
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
  const parser = new Parser({
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
  }
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

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/tools/webfetch.ts
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
function fetchedFilename(finalUrl, fallback) {
  try {
    const name = basename2(new URL(finalUrl).pathname);
    return name === "" || name === "/" ? fallback : name;
  } catch {
    return fallback;
  }
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
function createWebFetchTool(opts) {
  const { workspace, spillDir, attachImagesToChat, maxInlineImageBytes, fetchImpl } = opts;
  const imageUnavailableHint = opts.imageUnavailableHint ?? "If you need to see this image, ask the user to attach it to the chat.";
  const attachVideoToChat = opts.attachVideoToChat ?? false;
  const attachAudioToChat = opts.attachAudioToChat ?? false;
  const maxInlineMediaBytes = opts.maxInlineMediaBytes ?? DEFAULT_MAX_INLINE_MEDIA_BYTES;
  const bounded = (text, format, kind) => {
    const spillPath = join7(spillDir, spillFilename(format, kind));
    const capture = createBoundedCapture({
      spillPath,
      spillLabel: workspace.relativize(spillPath)
    });
    capture.append(text);
    const snapshot = capture.snapshot();
    return {
      content: snapshot.text,
      totalChars: snapshot.totalChars,
      truncated: snapshot.truncated
    };
  };
  const mediaHint = buildMediaHint({ image: attachImagesToChat, video: attachVideoToChat, audio: attachAudioToChat }, "fetching");
  return defineTool8({
    description: `Fetch a URL and return its content. HTML pages are reduced to their main content (boilerplate stripped, title/author/date header) and converted to readable markdown by default (set format to "text" for plain text or "html" for the raw page). Fetched PDF, DOCX, and spreadsheet files are converted to plain text; ${mediaHint}. Content over the in-context budget is truncated head+tail and the complete output is spilled to a file named in the truncation marker — read or grep that file instead of re-fetching. Default timeout ${WEB_FETCH_DEFAULT_TIMEOUT_SECONDS}s (${WEB_FETCH_PDF_DEFAULT_TIMEOUT_SECONDS}s for PDFs), max ${WEB_FETCH_MAX_TIMEOUT_SECONDS}s; responses over 5 MB error. Read-only: one HTTP GET, no side effects.`,
    inputSchema: z8.object({
      url: z8.string().min(1).describe("The URL to fetch. Must start with http:// or https://."),
      format: z8.enum(["markdown", "text", "html"]).optional().describe('How to render HTML responses: "markdown" (default), "text", or "html" (raw). Non-HTML content is unaffected.'),
      timeout: z8.number().int().positive().optional().describe(`Timeout in seconds (default ${WEB_FETCH_DEFAULT_TIMEOUT_SECONDS}, max ${WEB_FETCH_MAX_TIMEOUT_SECONDS}).`)
    }),
    async execute({ url, format, timeout }) {
      const renderFormat = format ?? "markdown";
      const fetched = await fetchWebResource({
        url,
        format: renderFormat,
        timeoutMs: resolveWebFetchTimeoutMs(timeout, url),
        ...timeout === undefined ? { pdfTimeoutMs: WEB_FETCH_PDF_DEFAULT_TIMEOUT_SECONDS * 1000 } : {},
        ...fetchImpl !== undefined ? { fetchImpl } : {}
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
          if (!attachImagesToChat || body.byteLength > maxInlineImageBytes) {
            const why = attachImagesToChat && body.byteLength > maxInlineImageBytes ? `too large to attach automatically (${body.byteLength} bytes, max ${maxInlineImageBytes})` : "cannot be returned as a tool result (text/json only), and image attachments are not enabled for this agent";
            return {
              ...imageMeta,
              note: `Image content ${why}. ${imageUnavailableHint}`
            };
          }
          const attachment = {
            kind: "image",
            dataUrl: `data:${imageMediaType(content.format)};base64,${body.toString("base64")}`,
            mediaType: imageMediaType(content.format),
            filename: fetchedFilename(finalUrl, "image"),
            width: content.width,
            height: content.height
          };
          return {
            ...imageMeta,
            note: "This image is queued and will be attached to your next message as a viewable image — no need to ask the user to attach it.",
            [CHAT_ATTACHMENT_FIELD]: attachment
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
          const label2 = kind === "video" ? "Video" : "Audio";
          const enabled = kind === "video" ? attachVideoToChat : attachAudioToChat;
          if (!enabled || body.byteLength > maxInlineMediaBytes) {
            const why = enabled && body.byteLength > maxInlineMediaBytes ? `too large to attach automatically (${body.byteLength} bytes, max ${maxInlineMediaBytes})` : `cannot be returned as a tool result (text/json only), and ${kind} attachments are not enabled for this agent`;
            return {
              ...mediaMeta,
              note: `${label2} content ${why}. Use bash (curl -o) to download it if you need to process it.`
            };
          }
          const attachment = {
            kind,
            dataUrl: `data:${mediaType};base64,${body.toString("base64")}`,
            mediaType,
            filename: fetchedFilename(finalUrl, kind)
          };
          return {
            ...mediaMeta,
            note: `This ${kind} file is queued and will be attached to your next message — no need to ask the user to attach it.`,
            [CHAT_ATTACHMENT_FIELD]: attachment
          };
        }
      }
    },
    toModelOutput(output) {
      if (typeof output === "object" && output !== null && CHAT_ATTACHMENT_FIELD in output) {
        const { [CHAT_ATTACHMENT_FIELD]: _omitted, ...rest } = output;
        return { type: "json", value: rest };
      }
      return { type: "json", value: output };
    }
  });
}

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/tools/write.ts
import { defineTool as defineTool9 } from "eve/tools";
import { z as z9 } from "zod";
function createWriteTool(opts) {
  const { workspace, noun } = opts;
  const io = opts.io ?? localIoProvider(workspace.root);
  return defineTool9({
    description: `Write a complete file to the ${noun}, creating parent directories and overwriting any existing file. For a small change to an existing file, prefer edit so you don't have to reproduce the whole file.`,
    inputSchema: z9.object({
      path: z9.string().min(1).describe(`File path, relative to the ${noun} root.`),
      content: z9.string().describe("The full contents to write.")
    }),
    async execute({ path, content }, ctx) {
      const abs = workspace.resolve(path);
      const fio = io(ctx);
      return withPathLock(abs, async () => {
        const created = await fio.stat(abs) === null;
        await fio.writeFile(abs, content);
        return {
          ok: true,
          path: workspace.relativize(abs),
          created,
          bytes: Buffer.byteLength(content)
        };
      });
    }
  });
}

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/sandbox-io.ts
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
function sandboxIoProvider(options) {
  const resolve3 = options.resolveSession ?? defaultResolveSession;
  return (ctx) => createSandboxIo({ root: options.root, session: () => resolve3(ctx) });
}
function createSandboxIo(opts) {
  const { root } = opts;
  let resolved = null;
  const session = () => {
    resolved ??= Promise.resolve(opts.session());
    return resolved;
  };
  async function run(command) {
    const sb = await session();
    return await sb.run({ command, workingDirectory: root });
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
      const sb = await session();
      const bytes = await sb.readBinaryFile({ path: abs });
      return bytes === null ? null : Buffer.from(bytes);
    },
    async writeFile(abs, content) {
      const sb = await session();
      const bytes = typeof content === "string" ? new TextEncoder().encode(content) : content;
      await sb.writeBinaryFile({ path: abs, content: bytes });
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
// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/hooks.ts
import { Client } from "eve/client";
import { defineHook } from "eve/hooks";

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/redeliver.ts
function isRecord5(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function redeliveryFromEvent(event) {
  if (!isRecord5(event) || event.type !== "action.result")
    return null;
  if (!isRecord5(event.data))
    return null;
  const result = event.data.result;
  if (!isRecord5(result) || result.kind !== "tool-result")
    return null;
  if (typeof result.callId !== "string" || result.callId.length === 0)
    return null;
  const attachment = readChatAttachment(result.output);
  if (!attachment)
    return null;
  return { toolCallId: result.callId, attachment };
}
function buildRedeliveryMessage(pending) {
  const names = pending.map((p) => p.attachment.filename).join(", ");
  return [
    { type: "text", text: `Attached: ${names} (auto-attached from read).` },
    ...pending.map((p) => ({
      type: "file",
      data: p.attachment.dataUrl,
      mediaType: p.attachment.mediaType,
      filename: p.attachment.filename
    }))
  ];
}
function createRedeliveryState() {
  const core = createParkDeliveryState();
  function toRequest(request) {
    if (!request)
      return null;
    return {
      sessionId: request.sessionId,
      continuationToken: request.continuationToken,
      pending: request.items.map((item) => ({
        toolCallId: item.key,
        attachment: item.payload
      }))
    };
  }
  return {
    observe(event, meta) {
      const request = toRequest(core.observe(event, meta));
      const found = redeliveryFromEvent(event);
      if (found) {
        core.enqueue(meta.sessionId, {
          key: found.toolCallId,
          payload: found.attachment
        });
      }
      return request;
    },
    settle(request, ok) {
      core.settle({
        sessionId: request.sessionId,
        continuationToken: request.continuationToken,
        items: request.pending.map((p) => ({
          key: p.toolCallId,
          payload: p.attachment
        }))
      }, ok);
    }
  };
}

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/hooks.ts
var RETRY_DELAYS_MS = [500, 2000, 5000];
function buildDeliveryMessage(request) {
  const media = request.items.flatMap((item) => item.payload.kind === "media" ? [{ toolCallId: item.key, attachment: item.payload.attachment }] : []);
  const notes = request.items.flatMap((item) => item.payload.kind === "note" ? [item.payload.text] : []);
  const steers = request.items.flatMap((item) => item.payload.kind === "steer" ? [item.payload.message.text] : []);
  return [
    ...steers.map((text) => ({ type: "text", text })),
    ...media.length > 0 ? buildRedeliveryMessage(media) : [],
    ...notes.map((text) => ({ type: "text", text }))
  ];
}
function isRecord6(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isSessionWaiting(event) {
  return isRecord6(event) && event.type === "session.waiting";
}
function createParkDeliveryHook(options = {}) {
  const serverUrl = options.serverUrl ?? `http://127.0.0.1:${process.env.PORT ?? "2000"}`;
  const log = options.log ?? true;
  const steerInbox = options.steer ? createSteerInbox({ dir: options.steer.dir }) : null;
  const state = createParkDeliveryState();
  async function deliver(request) {
    const client = new Client({ host: serverUrl });
    const message = buildDeliveryMessage(request);
    for (let attempt = 0;; attempt++) {
      try {
        const session = client.session({
          sessionId: request.sessionId,
          continuationToken: request.continuationToken,
          streamIndex: 0
        });
        const response = await session.send({ message });
        if (response.sessionId !== request.sessionId) {
          throw new Error(`park delivery landed on ${response.sessionId} instead of ${request.sessionId} (continuation token mismatch)`);
        }
        await response.result();
        const next = state.settle(request, true);
        if (log) {
          const labels = request.items.map((item) => item.payload.kind === "media" ? item.payload.attachment.filename : item.key);
          console.log(`[agent-sdk] park delivery to ${request.sessionId}: ${labels.join(", ")}`);
        }
        if (next)
          deliver(next);
        return;
      } catch (error) {
        const delay = RETRY_DELAYS_MS[attempt];
        if (delay === undefined) {
          state.settle(request, false);
          if (log) {
            console.warn(`[agent-sdk] park delivery to ${request.sessionId} failed; will retry on next park:`, error);
          }
          return;
        }
        await new Promise((resolve3) => setTimeout(resolve3, delay));
      }
    }
  }
  setParkNotificationHandler((sessionId, notification) => {
    const request = state.enqueue(sessionId, {
      key: notification.key,
      payload: { kind: "note", text: notification.text }
    });
    if (request)
      deliver(request);
  });
  return defineHook({
    events: {
      "*"(event, ctx) {
        const meta = {
          sessionId: ctx.session.id,
          continuationToken: ctx.channel.continuationToken
        };
        if (steerInbox && isSessionWaiting(event)) {
          const steers = steerInbox.drain(meta.sessionId);
          if (steers.length > 0) {
            const flush = state.enqueueAll(meta.sessionId, steers.map((message) => ({
              key: `steer:${message.id}`,
              payload: { kind: "steer", message }
            })));
            if (flush)
              deliver(flush);
          }
        }
        const request = state.observe(event, meta);
        if (request)
          deliver(request);
        const found = redeliveryFromEvent(event);
        if (found) {
          state.enqueue(meta.sessionId, {
            key: found.toolCallId,
            payload: { kind: "media", attachment: found.attachment }
          });
        }
      }
    }
  });
}
// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/task.ts
import { defineAgent } from "eve";
import { defineDynamic as defineDynamic3, defineInstructions as defineInstructions2 } from "eve/instructions";
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
function createTaskChildTools(options) {
  const noun = options.workspaceNoun ?? "workspace";
  const workspace = createWorkspace(options.workspaceRoot);
  const conventionsFileName = options.conventionsFileName ?? "AGENTS.md";
  const dirConventions = options.injectDirConventions ?? true ? {
    tracker: createDirConventionsTracker({
      workspaceRoot: workspace.root,
      fileName: conventionsFileName
    }),
    fileName: conventionsFileName
  } : undefined;
  return {
    read: createReadTool({
      workspace,
      noun,
      attachImagesToChat: false,
      maxInlineImageBytes: 0,
      dirConventions,
      imageUnavailableHint: "Its pixels are not available in a delegated child session — report the image's path and metadata in your final message so the caller can view it.",
      mediaUnavailableHint: "Its bytes are not available in a delegated child session — use bash extraction if text will do, or report the file's path and metadata so the caller can handle it."
    }),
    webfetch: createWebFetchTool({
      workspace,
      spillDir: options.spillDir,
      attachImagesToChat: false,
      maxInlineImageBytes: 0,
      imageUnavailableHint: "Its pixels are not available in a delegated child session — report the image's URL in your final message so the caller can fetch it."
    })
  };
}
var TASK_CHILD_TOOL_OVERRIDES = ["read", "webfetch"];
function buildTaskMarkdown(opts) {
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
  return defineAgent({
    description: options.description ?? buildTaskDescription(options),
    model: options.model,
    ...options.reasoning !== undefined ? { reasoning: options.reasoning } : {}
  });
}
var GATEWAY_MODELS_URL = "https://ai-gateway.vercel.sh/v1/models";
function isRecord7(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function parseGatewayModelCatalog(value) {
  if (!isRecord7(value) || !Array.isArray(value.data))
    return null;
  const models = [];
  for (const entry of value.data) {
    if (!isRecord7(entry) || typeof entry.id !== "string")
      return null;
    models.push({
      id: entry.id,
      name: typeof entry.name === "string" ? entry.name : undefined,
      description: typeof entry.description === "string" ? entry.description : undefined
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
// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/mock-model.ts
var STORY_SENTENCES = [
  "The lighthouse keeper counted the waves as they broke against the rocks.",
  "Every seventh wave carried a whisper from the old town beneath the sea.",
  "Marisol had kept the light burning for forty-one years without a single dark night.",
  "Tonight the fog rolled in thicker than she had ever seen it.",
  "Somewhere out past the shoals, a bell rang that no ship had carried in decades.",
  "She climbed the spiral stairs slowly, lantern in one hand, logbook in the other.",
  "The glass at the top of the tower was cold and streaked with salt.",
  "Below, the sea moved like a great animal turning in its sleep.",
  "She wrote the date in the logbook and then paused, pen hovering.",
  "The bell rang again, closer now, and the fog pressed against the windows."
];
function storyChunk(index) {
  const sentence = STORY_SENTENCES[index % STORY_SENTENCES.length] ?? "The story went on.";
  const paragraphBreak = index > 0 && index % 8 === 0 ? `

` : " ";
  return `${paragraphBreak}${sentence}`;
}
var delay = (ms) => ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();
function usageFor(outputTokens) {
  return {
    inputTokens: { total: 100, noCache: 100, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: outputTokens, text: outputTokens, reasoning: 0 }
  };
}
var MOCK_SCENARIOS = [
  "hitl",
  "parallel",
  "todo",
  "delegate",
  "fail",
  "burst",
  "markdown",
  "interleave",
  "empty"
];
function markdownChunks() {
  return [
    `## Streaming markdown stress

`,
    "A paragraph with **bold**, _italic_, `inline code`, and a [link](https://example.com).\n\n",
    "```ts\n",
    `export function keeper(light: number): string {
`,
    `  // the fence stays open across deltas
`,
    "  return `burning for ${light} years`;\n",
    `}
`,
    "```\n\n",
    `| tide | bell | fog |
`,
    `| --- | --- | --- |
`,
    `| low | quiet | thin |
`,
    `| high | ringing | thick |

`,
    `1. climb the stairs
`,
    `   - lantern in one hand
`,
    `   - logbook in the other
`,
    `2. write the date
`,
    `   1. pause, pen hovering
`,
    `   2. listen for the bell

`,
    `> The sea moved like a great animal turning in its sleep.

`,
    `Unicode: emoji \uD83C\uDF0A\uD83D\uDD14, CJK 灯台守は波を数えた, RTL مرحبا, combining é ñ ü.

`,
    "A very long unbroken token: " + "abcdefghij".repeat(40) + `

`,
    `Done. ✅
`
  ];
}
function mockScenarioFrom(text) {
  const match = /\[mock:([a-z]+)\]/.exec(text);
  const name = match?.[1];
  return MOCK_SCENARIOS.includes(name ?? "") ? name : null;
}
function scriptStepFrom(prompt) {
  let step = 0;
  for (const message of prompt) {
    if (message.role === "user")
      step = 0;
    else if (message.role === "tool") {
      step += message.content.filter((part) => part.type === "tool-result").length;
    }
  }
  return step;
}
function lastUserTextFrom(prompt) {
  return [...prompt].reverse().flatMap((message) => message.role === "user" ? message.content.flatMap((part) => part.type === "text" ? [part.text] : []) : [])[0];
}
function askQuestionCall(prompt, topic) {
  return {
    toolName: "ask_question",
    input: {
      prompt,
      options: [
        {
          id: "ship",
          label: `Ship the ${topic}`,
          style: "primary",
          description: "Proceed with the happy path."
        },
        { id: "hold", label: "Hold for review" },
        { id: "abort", label: "Abort the run", style: "danger", description: "Stops everything." }
      ],
      allowFreeform: true
    }
  };
}
function scriptActionFor(scenario, step, delegateToolName = "task_fast") {
  switch (scenario) {
    case "hitl":
      if (step === 0) {
        return {
          kind: "tool-calls",
          calls: [askQuestionCall("Mock HITL: how should this test proceed?", "change")]
        };
      }
      return { kind: "text", text: "Answer received — the mock turn resumed and finished cleanly." };
    case "parallel":
      if (step === 0) {
        return {
          kind: "tool-calls",
          calls: [
            askQuestionCall("Mock parallel HITL (1 of 2): which color?", "color"),
            askQuestionCall("Mock parallel HITL (2 of 2): which size?", "size")
          ]
        };
      }
      if (step === 1) {
        return {
          kind: "text",
          text: "Only one answer arrived — the parallel HITL scenario ended without the second."
        };
      }
      return {
        kind: "text",
        text: "Both answers received — the parallel HITL scenario finished cleanly."
      };
    case "todo":
      if (step === 0) {
        return {
          kind: "tool-calls",
          calls: [
            {
              toolName: "todo",
              input: {
                todos: [
                  { content: "Survey the harbor charts", status: "completed", priority: "high" },
                  { content: "Polish the tower glass", status: "in_progress", priority: "medium" },
                  { content: "Refill the oil reserves", status: "pending", priority: "medium" },
                  { content: "Log the evening tide", status: "pending", priority: "low" }
                ]
              }
            }
          ]
        };
      }
      if (step === 1) {
        return {
          kind: "tool-calls",
          calls: [
            {
              toolName: "todo",
              input: {
                todos: [
                  { content: "Survey the harbor charts", status: "completed", priority: "high" },
                  { content: "Polish the tower glass", status: "completed", priority: "medium" },
                  { content: "Refill the oil reserves", status: "in_progress", priority: "medium" },
                  { content: "Log the evening tide", status: "cancelled", priority: "low" }
                ]
              }
            }
          ]
        };
      }
      return { kind: "text", text: "Todo list written and updated — checklist scenario complete." };
    case "delegate":
      if (step === 0) {
        return {
          kind: "tool-calls",
          calls: [
            {
              toolName: delegateToolName,
              input: {
                message: "Mock delegation: describe the lighthouse keeper's routine. Reply with a short report."
              }
            }
          ]
        };
      }
      return { kind: "text", text: "The delegate reported back — delegation scenario complete." };
  }
}
function toolInputFragments(inputJson, fragmentSize = 24) {
  if (inputJson.length === 0)
    return [];
  const fragments = [];
  for (let i = 0;i < inputJson.length; i += fragmentSize) {
    fragments.push(inputJson.slice(i, i + fragmentSize));
  }
  return fragments;
}
function createMockStoryModel(options = {}) {
  const chunkCount = options.chunkCount ?? 240;
  const chunkDelayMs = options.chunkDelayMs ?? 250;
  const burstChunks = options.burstChunks ?? 600;
  const delegateToolName = options.delegateToolName ?? "task_fast";
  const now = options.now ?? Date.now;
  return {
    specificationVersion: "v4",
    provider: "anthropic",
    modelId: "claude-sonnet-4-6",
    supportedUrls: {},
    async doGenerate() {
      return {
        content: [{ type: "text", text: "(mock model, non-streaming reply)" }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: usageFor(10),
        warnings: []
      };
    },
    async doStream(callOptions) {
      const abortSignal = callOptions.abortSignal;
      const lastUserText = lastUserTextFrom(callOptions.prompt);
      const scenario = mockScenarioFrom(lastUserText ?? "");
      const step = scriptStepFrom(callOptions.prompt);
      const topic = (lastUserText ?? "an untitled request").slice(0, 60);
      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue({ type: "stream-start", warnings: [] });
          controller.enqueue({
            type: "response-metadata",
            id: `mock-${now()}`,
            modelId: "claude-sonnet-4-6",
            timestamp: new Date(now())
          });
          if (scenario === "fail") {
            controller.enqueue({ type: "text-start", id: "t1" });
            for (let i = 0;i < 6; i++) {
              if (abortSignal?.aborted)
                break;
              await delay(chunkDelayMs);
              controller.enqueue({ type: "text-delta", id: "t1", delta: storyChunk(i) });
            }
            controller.enqueue({ type: "text-end", id: "t1" });
            controller.enqueue({
              type: "error",
              error: new Error("mock: injected mid-stream failure [mock:fail]")
            });
            controller.close();
            return;
          }
          if (scenario === "burst") {
            controller.enqueue({ type: "text-start", id: "t1" });
            controller.enqueue({
              type: "text-delta",
              id: "t1",
              delta: `**Burst: ${burstChunks} deltas, no pacing.**

`
            });
            for (let i = 0;i < burstChunks; i++) {
              if (abortSignal?.aborted)
                break;
              controller.enqueue({
                type: "text-delta",
                id: "t1",
                delta: i % 8 === 0 ? `${storyChunk(i)} [¶${i / 8 + 1}]` : storyChunk(i)
              });
            }
            controller.enqueue({ type: "text-delta", id: "t1", delta: `

**Burst done.**` });
            controller.enqueue({ type: "text-end", id: "t1" });
            controller.enqueue({
              type: "finish",
              finishReason: { unified: "stop", raw: "stop" },
              usage: usageFor(burstChunks * 12)
            });
            controller.close();
            return;
          }
          if (scenario === "markdown") {
            controller.enqueue({ type: "text-start", id: "t1" });
            for (const chunk of markdownChunks()) {
              if (abortSignal?.aborted)
                break;
              await delay(Math.min(chunkDelayMs, 120));
              controller.enqueue({ type: "text-delta", id: "t1", delta: chunk });
            }
            controller.enqueue({ type: "text-end", id: "t1" });
            controller.enqueue({
              type: "finish",
              finishReason: { unified: "stop", raw: "stop" },
              usage: usageFor(400)
            });
            controller.close();
            return;
          }
          if (scenario === "interleave") {
            const blocks = [
              {
                kind: "reasoning",
                id: "r1",
                text: "First thought: check the tide tables before anything else."
              },
              {
                kind: "text",
                id: "t1",
                text: `The tide tables say low water at dusk.

That changes the plan.`
              },
              {
                kind: "reasoning",
                id: "r2",
                text: "Second thought: the bell only rings when the fog is thick."
              },
              {
                kind: "text",
                id: "t2",
                text: "So the keeper waits for the bell — interleave scenario complete."
              }
            ];
            for (const block of blocks) {
              const startType = block.kind === "reasoning" ? "reasoning-start" : "text-start";
              const deltaType = block.kind === "reasoning" ? "reasoning-delta" : "text-delta";
              const endType = block.kind === "reasoning" ? "reasoning-end" : "text-end";
              controller.enqueue({ type: startType, id: block.id });
              for (const word of block.text.split(" ")) {
                if (abortSignal?.aborted)
                  break;
                await delay(Math.min(chunkDelayMs, 80));
                controller.enqueue({ type: deltaType, id: block.id, delta: `${word} ` });
              }
              controller.enqueue({ type: endType, id: block.id });
              if (abortSignal?.aborted)
                break;
            }
            controller.enqueue({
              type: "finish",
              finishReason: { unified: "stop", raw: "stop" },
              usage: usageFor(120)
            });
            controller.close();
            return;
          }
          if (scenario === "empty") {
            controller.enqueue({
              type: "finish",
              finishReason: { unified: "stop", raw: "stop" },
              usage: usageFor(0)
            });
            controller.close();
            return;
          }
          if (scenario !== null) {
            const action = scriptActionFor(scenario, step, delegateToolName);
            controller.enqueue({ type: "reasoning-start", id: "r1" });
            for (const word of `Scripted ${scenario} scenario, step ${step}: deciding the next move.`.split(" ")) {
              if (abortSignal?.aborted)
                break;
              await delay(chunkDelayMs);
              controller.enqueue({ type: "reasoning-delta", id: "r1", delta: `${word} ` });
            }
            controller.enqueue({ type: "reasoning-end", id: "r1" });
            if (action.kind === "tool-calls") {
              for (const [callIndex, call] of action.calls.entries()) {
                const toolCallId = `mock-call-${scenario}-${step}-${callIndex}`;
                const inputJson = JSON.stringify(call.input);
                controller.enqueue({
                  type: "tool-input-start",
                  id: toolCallId,
                  toolName: call.toolName
                });
                for (const fragment of toolInputFragments(inputJson)) {
                  if (abortSignal?.aborted)
                    break;
                  await delay(Math.min(chunkDelayMs, 80));
                  controller.enqueue({ type: "tool-input-delta", id: toolCallId, delta: fragment });
                }
                controller.enqueue({ type: "tool-input-end", id: toolCallId });
                controller.enqueue({
                  type: "tool-call",
                  toolCallId,
                  toolName: call.toolName,
                  input: inputJson
                });
              }
              controller.enqueue({
                type: "finish",
                finishReason: { unified: "tool-calls", raw: "tool_use" },
                usage: usageFor(50 * action.calls.length)
              });
              controller.close();
              return;
            }
            controller.enqueue({ type: "text-start", id: "t1" });
            for (const word of action.text.split(" ")) {
              if (abortSignal?.aborted)
                break;
              await delay(chunkDelayMs);
              controller.enqueue({ type: "text-delta", id: "t1", delta: `${word} ` });
            }
            controller.enqueue({ type: "text-end", id: "t1" });
            controller.enqueue({
              type: "finish",
              finishReason: { unified: "stop", raw: "stop" },
              usage: usageFor(action.text.length)
            });
            controller.close();
            return;
          }
          controller.enqueue({ type: "text-start", id: "t1" });
          controller.enqueue({
            type: "text-delta",
            id: "t1",
            delta: `**Story for: "${topic}…"**

`
          });
          for (let i = 0;i < chunkCount; i++) {
            if (abortSignal?.aborted)
              break;
            await delay(chunkDelayMs);
            controller.enqueue({
              type: "text-delta",
              id: "t1",
              delta: i % 8 === 0 ? `${storyChunk(i)} [${topic.slice(0, 12)}… ¶${i / 8 + 1}]` : storyChunk(i)
            });
          }
          controller.enqueue({ type: "text-end", id: "t1" });
          controller.enqueue({
            type: "finish",
            finishReason: { unified: "stop", raw: "stop" },
            usage: usageFor(chunkCount * 12)
          });
          controller.close();
        }
      });
      return { stream };
    }
  };
}

// ../../../../../tmp/agent-sdk-mirror-YSnTz8/repo/src/index.ts
function createStdlib(options) {
  const noun = options.workspaceNoun ?? "workspace";
  const workspace2 = createWorkspace(options.workspaceRoot);
  const spillDir = join8(options.stateDir, TOOL_OUTPUT_DIRNAME);
  const runner = createCommandRunner({ workspace: workspace2, spillDir });
  const registry = createTaskRegistry({
    storePath: join8(options.stateDir, "tasks.json")
  });
  const backgroundables = [
    createBashOp(runner),
    ...options.extraBackgroundables?.({ workspace: workspace2, runner }) ?? []
  ];
  const conventionsFileName = options.conventionsFileName ?? "AGENTS.md";
  const dirConventions = options.injectDirConventions ?? true ? {
    tracker: createDirConventionsTracker({
      workspaceRoot: workspace2.root,
      fileName: conventionsFileName
    }),
    fileName: conventionsFileName
  } : undefined;
  const steerInbox = options.steer ? createSteerInbox({ dir: options.steer.dir }) : null;
  const steer2 = createSteerWrapper(steerInbox);
  return {
    workspace: workspace2,
    runner,
    registry,
    spillDir,
    backgroundables,
    steerInbox,
    tools: {
      read: steer2(createReadTool({
        workspace: workspace2,
        noun,
        attachImagesToChat: options.attachImagesToChat ?? true,
        maxInlineImageBytes: options.maxInlineImageBytes ?? DEFAULT_MAX_INLINE_IMAGE_BYTES,
        attachVideoToChat: options.attachVideoToChat ?? false,
        attachAudioToChat: options.attachAudioToChat ?? false,
        maxInlineMediaBytes: options.maxInlineMediaBytes ?? DEFAULT_MAX_INLINE_MEDIA_BYTES,
        dirConventions
      })),
      edit: steer2(createEditTool({ workspace: workspace2, noun })),
      write: steer2(createWriteTool({ workspace: workspace2, noun })),
      glob: steer2(createGlobTool({ workspace: workspace2, noun })),
      grep: steer2(createGrepTool({ workspace: workspace2, noun, spillDir })),
      bash: steer2(createBashTool({
        workspace: workspace2,
        runner,
        registry,
        noun,
        interactiveHint: options.bashInteractiveHint
      })),
      tasks: createTasksTools({ registry, backgroundables, steerInbox }),
      webfetch: steer2(createWebFetchTool({
        workspace: workspace2,
        spillDir,
        attachImagesToChat: options.attachImagesToChat ?? true,
        maxInlineImageBytes: options.maxInlineImageBytes ?? DEFAULT_MAX_INLINE_IMAGE_BYTES,
        attachVideoToChat: options.attachVideoToChat ?? false,
        attachAudioToChat: options.attachAudioToChat ?? false,
        maxInlineMediaBytes: options.maxInlineMediaBytes ?? DEFAULT_MAX_INLINE_MEDIA_BYTES
      }))
    },
    instructions: {
      parallelTools: createParallelToolsInstruction(),
      repoConventions: createRepoConventionsInstruction({ workspaceRoot: workspace2.root }),
      subagents: createSubagentInstruction({
        workspaceNoun: noun,
        roster: options.subagentRoster
      }),
      workflow: createWorkflowInstruction({
        workspaceNoun: noun,
        verifyCommandHint: options.verifyCommandHint
      }),
      communication: createCommunicationInstruction(),
      hitl: createHitlInstruction()
    }
  };
}
function createSandboxFileTools(options) {
  const noun = options.workspaceNoun ?? "workspace";
  const workspace2 = createWorkspace(options.workspaceRoot);
  const io = sandboxIoProvider({
    root: workspace2.root,
    ...options.resolveSession !== undefined ? { resolveSession: options.resolveSession } : {}
  });
  const conventionsFileName = options.conventionsFileName ?? "AGENTS.md";
  const dirConventions = options.injectDirConventions ?? true ? {
    tracker: createDirConventionsTracker({
      workspaceRoot: workspace2.root,
      fileName: conventionsFileName
    }),
    fileName: conventionsFileName
  } : undefined;
  return {
    workspace: workspace2,
    io,
    tools: {
      read: createReadTool({
        workspace: workspace2,
        noun,
        io,
        attachImagesToChat: options.attachImagesToChat ?? false,
        maxInlineImageBytes: options.maxInlineImageBytes ?? DEFAULT_MAX_INLINE_IMAGE_BYTES,
        attachVideoToChat: options.attachVideoToChat ?? false,
        attachAudioToChat: options.attachAudioToChat ?? false,
        maxInlineMediaBytes: options.maxInlineMediaBytes ?? DEFAULT_MAX_INLINE_MEDIA_BYTES,
        dirConventions
      }),
      edit: createEditTool({ workspace: workspace2, noun, io }),
      write: createWriteTool({ workspace: workspace2, noun, io }),
      glob: createGlobTool({ workspace: workspace2, noun, io }),
      grep: createGrepTool({
        workspace: workspace2,
        noun,
        io,
        ...options.spillDir !== undefined ? { spillDir: options.spillDir } : {}
      })
    }
  };
}
export {
  withSteerDelivery,
  walkFiles,
  videoMediaType,
  toolInputFragments,
  stripSteerFromOutput,
  shellSingleQuote,
  setParkNotificationHandler,
  serializeSteerLine,
  searchLocal,
  scriptStepFrom,
  scriptActionFor,
  sandboxIoProvider,
  resolveWithin,
  resolveWebFetchTimeoutMs,
  renderWebText,
  relativizeWithin,
  redeliveryFromEvent,
  readTextForSearch,
  readSteerMessages,
  readChatAttachment,
  postParkNotification,
  parseSteerLine,
  parseSearchOutput,
  parseGatewayModelCatalog,
  mockScenarioFrom,
  mergeSteerIntoModelOutput,
  markdownChunks,
  looksLikeHtml,
  localIoProvider,
  loadFileContent,
  listGitFiles,
  lastUserTextFrom,
  isHtmlContentType,
  imageMediaType,
  globToRegExp,
  formatWatchNotification,
  formatSteerText,
  formatCompletionNotification,
  fetchWebResource,
  fetchGatewayModelCatalog,
  extractTextFromHtml,
  extractSheets,
  extractSearchExit,
  extractPdf,
  extractDocx,
  expectedTaskToolNames,
  dirChain,
  detectFileKind,
  defineOp,
  createWriteTool,
  createWorkspace,
  createWorkflowInstruction,
  createWebFetchTool,
  createTasksTools,
  createTaskRegistry,
  createTaskInstruction,
  createTaskChildTools,
  createTaskAgent,
  createSubagentInstruction,
  createSteerWrapper,
  createSteerInbox,
  createStdlib,
  createStatCache,
  createSandboxIo,
  createSandboxFileTools,
  createRepoConventionsInstruction,
  createRedeliveryState,
  createReadTool,
  createParkDeliveryState,
  createParkDeliveryHook,
  createParallelToolsInstruction,
  createOutputWatcher,
  createMockStoryModel,
  createLocalIo,
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
  clientContinuationToken,
  buildWorkflowMarkdown,
  buildWebFetchHeaders,
  buildTasksToolset,
  buildTaskMarkdown,
  buildTaskDescription,
  buildSubagentMarkdown,
  buildSteerPayload,
  buildRepoConventionsMarkdown,
  buildRedeliveryMessage,
  buildHitlMarkdown,
  buildFileView,
  buildCommunicationMarkdown,
  audioMediaType,
  attachSteerToOutput,
  assertHttpUrl,
  __resetTaskRegistryCacheForTests,
  __resetDirConventionsCacheForTests,
  WEB_FETCH_PDF_DEFAULT_TIMEOUT_SECONDS,
  WEB_FETCH_MAX_TIMEOUT_SECONDS,
  WEB_FETCH_MAX_RESPONSE_BYTES,
  WEB_FETCH_DEFAULT_TIMEOUT_SECONDS,
  TOOL_OUTPUT_DIRNAME,
  TASK_DISABLED_BUILTINS,
  TASK_CHILD_TOOL_OVERRIDES,
  TAIL_CHARS,
  STEER_WRAPPED_OUTPUT_FIELD,
  STEER_NOTE,
  STEER_FIELD,
  STEER_DIRNAME,
  SHEET_ROW_CAP,
  SEARCH_OUTPUT_CAP_BYTES,
  READ_FILE_MAX_LINE_CHARS,
  READ_FILE_MAX_CONTENT_CHARS,
  READ_FILE_MAX_BYTES,
  READ_FILE_DEFAULT_LINE_LIMIT,
  PDF_PAGE_CAP,
  PDF_EMPTY_PAGE_NOTE,
  MOCK_SCENARIOS,
  MAX_SEARCH_FILE_BYTES,
  MAX_PREVIEW,
  HEAD_CHARS,
  GATEWAY_MODELS_URL,
  FALLBACK_USER_AGENT,
  DEFAULT_WATCH_DEBOUNCE_MS,
  DEFAULT_MAX_WATCH_NOTIFICATIONS,
  DEFAULT_MAX_INLINE_MEDIA_BYTES,
  DEFAULT_MAX_INLINE_IMAGE_BYTES,
  CHAT_ATTACHMENT_FIELD,
  BROWSER_USER_AGENT,
  ALWAYS_IGNORED
};
