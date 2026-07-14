# Guide

The deep end of `@zocomputer/agent-sdk`: what each subsystem does and how to
configure it. Start with the [README](./README.md) for install + quick start;
come here when you want the details. The generated
[API reference](docs/README.md) covers every exported symbol (the `docs/`
directory exists only on the public mirror).

## Wiring reference

The quick start in the README is the short version. The full picture:

### Tool files

One file per tool under `agent/tools/`; the filename is the name the model
calls.

| file          | export                  | model sees |
| ------------- | ----------------------- | ---------- |
| `read.ts`     | `stdlib.tools.read`     | `read`     |
| `edit.ts`     | `stdlib.tools.edit`     | `edit`     |
| `write.ts`    | `stdlib.tools.write`    | `write`    |
| `glob.ts`     | `stdlib.tools.glob`     | `glob`     |
| `grep.ts`     | `stdlib.tools.grep`     | `grep`     |
| `bash.ts`     | `stdlib.tools.bash`     | `bash`     |
| `webfetch.ts` | `stdlib.tools.webfetch` | `webfetch` |
| `todo.ts`     | `stdlib.tools.todo`     | `todo`     |
| `tasks.ts`\*  | `stdlib.tools.tasks`    | `run_async`, `check_tasks`, `await_task` |
| `look.ts`\*\* | `stdlib.tools.look`     | `look`     |

\* The task tools are a bundle — one file exports all three, so its own
filename is free.

\*\* Only with `mediaOracle` set — see
[The media oracle](#the-media-oracle-look).

eve injects every built-in tool whose name you don't override or disable:

- **Same name → automatic override.** `bash.ts` already replaces eve's
  built-in `bash`, and `todo.ts` replaces eve's framework `todo` with the
  discipline-enforcing wrapper; nothing else to do.
- **Different name → disable the built-in** so the model doesn't see two
  file readers/writers. The stdlib uses the Claude Code / opencode names
  (`read`, `write`), so shim out eve's `read_file` and `write_file` with
  `disableTool()` files.

### The instruction stack

The stdlib ships the operational prose alongside the tools — the workflow,
communication, and HITL contracts that make an agent behave well, not just
the file operations. The prescribed wiring is **one file**, the composed
stack:

```ts
// agent/instructions/stack.ts
import { stdlib } from "../lib/stdlib";
export default stdlib.instructions.stack;
```

One file matters because eve orders instruction slots **alphabetically by
filename** — per-section files put the prompt in alphabetical order, not a
deliberate one. The stack renders every section in its canonical order:

| section id        | heading                                   | teaches |
| ----------------- | ----------------------------------------- | ------- |
| `repo-conventions`| Repository conventions (root AGENTS.md)   | injects the workspace's root `AGENTS.md` |
| `workflow`        | How to work                               | explore before edit, read before edit, reproduce a bug before fixing it, verify, finish before ending the turn |
| `planning`        | Planning your work (todo)                 | the `todo` tool contract — when to plan, whole-list writes, one `in_progress`, rewrite on pivots |
| `parallel-tools`  | Parallel tool calls                       | background tasks, explicit polling, await-before-ending |
| `subagents`       | Delegating with the agent tool            | delegation with eve's built-in `agent` tool (+ roster routing) |
| `media`           | Media you can't view (look)               | (only with `mediaOracle` set) view natively what the model supports, `look` at the rest |
| `hitl`            | Asking the user (ask_question)            | the `ask_question` playbook — options, `style: "primary"`, `allowFreeform`, ask independent questions together |
| `communication`   | Communicating                             | lead with the outcome, write tight, take a position, structure deliberately, report precisely |

**Tiers.** Every section is authored in two depths — `full` (the default:
numbered rules, worked examples) and `compact` (the same contracts, tighter
prose, for models that follow instructions well without the redundancy).
`createSandboxFileTools({ instructionTier: "compact" })` switches the whole stack; the
à la carte factories take the same `tier` option. Both tiers of a section
live in one builder function and tests pin their parity (same load-bearing
tool names and thresholds in both), so the compact tier can't silently drift
from the full one — the failure mode of maintaining two prompt files by hand.

**Extending the stack.** Consumers edit the composition, not the prose:

```ts
createSandboxFileTools({
  // drop a baseline section by id
  omitInstructionSections: ["planning"],
  // splice your own sections in at a deliberate spot; the function form is
  // evaluated on session.started, for catalogs read from disk per session
  extraInstructionSections: () => [
    {
      section: { id: "skills", heading: "Available skills", body: renderCatalog() },
      placement: { after: "workflow" }, // or { before: id }; omitted → appended last
    },
  ],
});
```

An unknown anchor appends the extra at the end rather than throwing — a typo
degrades, never crashes a session. The vocabulary (`PromptSection`,
`PlacedPromptSection`, `composePromptSections`, `renderPromptSections`) is
exported for consumers building their own composed instructions.

One ready-made extra ships with the SDK: `toolAuthoringSection` (id
`tool-authoring`, heading "Authoring tools") — the tool contract the SDK's own
tools follow (snake_case names/params, flat strip-mode schemas, corrective
thrown errors, echo-back result keys, static descriptions), for agents that
**write** eve tools (an agent-builder editing another agent's `tools/`
directory). It's deliberately not in the baseline — most agents never author
tools — so wire it through `extraInstructionSections` (or à la carte via
`createToolAuthoringInstruction`).

Eve 0.22 now returns schema-invalid inputs and thrown execution failures to the
model as failed tool results, so either can be corrected within the same turn.
That makes the SDK contract's error text more important, not redundant: eve
transports the message, while the tool still has to replace raw backend errors
with the field, unchanged-state guarantee, and resend instruction the model
needs. `run_async` also keeps its inner `safeParse`; its selected operation and
operation-specific schema are dynamic data inside the outer tool call, beyond
eve's model-facing schema validator.

On a split topology, `createSandboxFileTools` returns the same stack
pre-configured for the sandbox — see
[Sandbox-backed file tools](#sandbox-backed-file-tools-split-topologies).

**À la carte.** Every section also remains an individual instruction
(`stdlib.instructions.workflow`, `.planning`, `.communication`, `.hitl`,
`.parallelTools`, `.repoConventions`, `.subagents`, `.media`) — that's what
declared subagent dirs re-export, since they inherit nothing and typically
want a subset (see [Model-tier task subagents](#model-tier-task-subagents)).
Don't register the stack *and* the same section à la carte in one agent —
the model would read the prose twice.

Persona stays yours: the stdlib ships operational contracts, not voice —
write your agent's identity as your own instruction file (see the example's
`coder.ts`).

## Tool behavior

The names are deliberately boring; the behavior behind them is the point:

- **`read`** is multi-format — line-numbered text windows plus content-sniffed
  document → text conversion: PDF (PDFium via `clawpdf`, per-page markers),
  DOCX (`mammoth`), PPTX (per-slide markers + speaker notes), ODT/ODP,
  spreadsheets (`.xlsx`/`.xlsm`/`.xls`/`.ods` via SheetJS, TSV per sheet),
  EPUB (spine order, per-section markers), Jupyter notebooks (per-cell
  markers, output stubs instead of base64 blobs), RTF, and UTF-16 BOM
  decode. Reading **image/video/audio** returns metadata plus an actionable
  note, routed to `look` when a media oracle is wired (see
  [Media reads](#media-reads-images-video-audio)).
  No-extractor formats fail with a named, actionable error; extraction is cached
  by path + stat. The first read under a directory with its own `AGENTS.md`
  attaches that file to the result (`directory_conventions`), **once per
  directory per session** — nested conventions arrive exactly when the model
  enters the directory, instead of hoping it remembers to read them. The root
  file is excluded (`instructions.repoConventions` already injects it); riders
  are result content, so the prompt prefix stays byte-stable. Opt out with
  `injectDirConventions: false`; rename the file with `conventionsFileName`.
- **`edit`** replaces a string through a **forgiving matcher** (ported from
  opencode's replacer cascade): an exact `old_string` always wins and replaces
  byte-for-byte, but a near miss — re-indented lines, collapsed whitespace,
  over-escaped `\n`/`\"` from a JSON-mangled tool call, stray boundary
  whitespace, or a fuzzy block match anchored on its first/last lines — still
  lands instead of bouncing the model into a re-read-and-retry loop. Guardrails
  keep forgiveness safe: the match must be **unique** (or `replace_all`), a
  candidate disproportionately larger than `old_string` is refused outright,
  and the result reports which strategy `matched` (`"simple"` = exact) so
  drift is observable. A leading UTF-8 BOM is split off before matching and
  restored on write. Failures return model-actionable messages (not found /
  not unique / disproportionate) — and a not-found error appends a
  **"did you mean" hint** (ported from goose's `find_similar_context`): the
  closest region by the `old_string`'s first-line anchor (containment, then
  fuzzy similarity), as a line-numbered ~20-line preview, so the model
  corrects in one shot instead of re-reading the whole file. The matcher is
  exported standalone as `replaceForgiving` + `editNotFoundHint`
  (`edit-match.ts`).
- **`write`** creates parent directories, and preserves an existing file's
  leading BOM when the new content omits it — a model rewriting a BOM'd file
  never strips the marker by accident. Both `edit` and `write` refuse a
  directory target with a named error saying to give a file path instead,
  rather than leaking a raw `EISDIR`.
- **`glob` / `grep`** prefer git-tracked candidates (`git ls-files`), falling
  back to a filesystem walk outside a repo, with bounded result counts.
- **`bash`** waits briefly, then auto-backgrounds a still-running command
  (returns a `task_id`); oversized output spills to `stateDir` instead of
  flooding the context window.
- **`webfetch`** returns a page as markdown (default), plain text, or raw
  HTML. HTML is reduced to its **main content** under a title/byline header
  (`defuddle` extraction, with a guard that falls back to the full page when
  extraction over-prunes), and the result is honest about failure: a page that
  yields almost no text gets a note saying so (with a hint for known
  client-rendered/login-walled domains like X or Reddit), and a conversion
  that leaves raw HTML flags itself. Fetched documents (PDF, DOCX/ODT/RTF,
  PPTX/ODP, spreadsheets, EPUB, notebooks) route through the same extractors
  as `read` (`.pdf` URLs get a longer default timeout); images return
  metadata and attach to the chat like `read`. Overflow has **two modes**:
  with `spillDir` (what the composed toolset wires — wherever `read` shares a
  filesystem with the tool), content past ~50k chars truncates head+tail and
  the complete output spills to a file the marker names; **without it**
  (inline-first — the split-topology mode, where a spill would land on the
  eve process's disk the sandbox-backed `read` can't reach), the whole
  rendered content returns inline up to `maxInlineContentChars` (default
  100k), then truncates head+tail with no file to point at.
- **`todo`** wraps eve's framework todo — same durable session state, same
  schemas and `{ counts, todos }` result, so the UI checklist and the
  compaction re-injection keep working — and enforces the checklist rules the
  description used to merely suggest: every item needs non-empty content,
  unique within the list (content is the item's identity across writes — the
  write is a full replacement with no ids), at most **one** item
  `in_progress`, and an item that was `pending` can't jump straight to
  `completed` without passing through `in_progress`. An invalid write is
  **rejected with the list unchanged** and a per-violation message, which is
  feedback the model actually corrects on — an ignored guideline isn't. Reads
  and valid writes pass straight through. The validation core is exported
  standalone (`validateTodoWrite`, `parseTodoItems`, `formatTodoViolations`
  in `todo-discipline.ts`).
- **`run_async` / `check_tasks` / `await_task`** persist the task registry
  across restarts (tasks running across a restart report as `lost`); any
  `defineOp` op becomes `run_async`-able via `extraBackgroundables`.

## Media reads (images, video, audio)

eve tool results are text/json only, so `read` and `webfetch` return metadata
for images, video, and audio. Their result notes route the model to `look`
when a media oracle is wired; without one they point to bash extraction or a
user-provided attachment. Documents still convert to text directly.

Native multimodal tool results remain an upstream goal. They would let the
model inspect media in the step after `read`, without a synthetic follow-up
turn. The worked Eve change is in
[`design/proposals/eve-content-tool-results.md`](./design/proposals/eve-content-tool-results.md).

## The media oracle (`look`)

Not every model sees every filetype — GLM takes text only, most models take
images and PDFs, essentially only the Gemini family takes video and audio.
`look` is the delegation move for what the session model can't view: one
question about a media file, answered by a pinned capable model.
Conceptually a one-shot media subagent; mechanically a plain tool call — it
reads the bytes through the workspace IO and calls the AI SDK's
`generateText` directly with a file part, so it sidesteps eve's media gates
entirely (text-only subagent input, text/json tool results, the hydration
whitelist) and works in task children too.

- **Wire it with `createSandboxFileTools({ mediaOracle: true })`** (or on
  `createSandboxFileTools`) and one `agent/tools/look.ts` re-export. `true`
  selects `DEFAULT_MEDIA_ORACLE` — `google/gemini-3-flash`, the recommended
  default because the oracle's capability set must cover every kind the copy
  routes to it, and the google family alone takes video+audio. Pass a
  `LookOracleConfig` to pin a different model, cap sizes, or add headers
  (a metered deployment labels the tool's own model traffic there, e.g. Zo's
  `x-zo-tool`).
- **Model resolution rides the AI SDK's rails**: a slug string resolves
  through the global default gateway provider (`AI_GATEWAY_API_KEY`, or a
  registered default provider on a hosted platform); a `LanguageModel`
  instance passes through untouched. No credentials enter the SDK.
- **The copy follows the oracle**: `tools.look` and `instructions.media`
  appear, and read/webfetch's unavailable-media hints route to `look`
  instead of dead-ending at "ask the user" / "report the path".
- **Capability data lives in `model-capabilities.ts`**:
  `capabilitiesForModel(modelId, catalog)` resolves a model's
  `ModelInputCapabilities` from the gateway catalog's tags (`vision`,
  `file-input`) plus a curated family overlay for what the catalog
  under-reports (google → video+audio). Resolve in a one-shot refresh script
  and check the result in — capability text lands in tool descriptions, part
  of the cached prompt prefix, so it must be static and offline-safe.

## Model-tier task subagents

A generic delegation worker: a full-capability copy of your agent pinned to a
model the *caller* chooses. Eve has no per-call model parameter — a subagent
tool's input is fixed at `{ message, outputSchema? }` and its model compiles
from its `agent.ts` — so the model knob is **one declared subagent per tier**
(`task_fast`, `task_deep`, …): the parent picks a model by picking a tool, and
each tool's description carries that model's identity and routing guidance.

```ts
// agent/subagents/task_fast/agent.ts — the tier's identity + pinned model
import { createTaskAgent } from "@zocomputer/agent-sdk";
export default createTaskAgent({
  model: "anthropic/claude-sonnet-5",
  modelName: "Claude Sonnet 5",
  modelBlurb: "…", // the model's catalog description, checked in (see below)
  use: "Prefer it for quick, well-scoped subtasks — exploration, focused questions, mechanical edits — where a fast, cheap model is enough.",
  workspaceNoun: "repo",
});

// agent/subagents/task_fast/instructions/task.ts — the child's operating contract
import { createTaskInstruction } from "@zocomputer/agent-sdk";
export default createTaskInstruction({ workspaceNoun: "repo" });

// agent/subagents/task_fast/tools/bash.ts — one re-export per PARENT tool
export { default } from "../../../tools/bash";

// agent/subagents/task_fast/tools/read.ts — every ordinary tool is the
// parent's exact instance
export { default } from "../../../tools/read";
```

**The critical part: a declared subagent inherits nothing from the root.** An
absent `tools/` slot falls back to eve's *framework defaults*, not your
authored tools — so "same tools as the parent" must be constructed: one
re-export file per parent tool (parent disable shims included), minus any
parent-session-coupled tools you exclude, plus a `disableTool()` shim per
`TASK_DISABLED_BUILTINS` entry (just `ask_question`: a parked child parks the
parent's turn, so the task contract is decide-and-report). Do **not** shim the
`agent` clone tool: eve injects it at the harness layer rather than as a
framework tool, so a shim for it fails runtime agent-graph resolution and
breaks every session. Eve's default `maxSubagentDepth: 1` rejects delegation
from a task child, and the task instruction says not to try it (see
[`design/upstream-asks.md`](./design/upstream-asks.md)):

```ts
// agent/subagents/task_fast/tools/ask_question.ts
import { disableTool } from "eve/tools";
export default disableTool();
```

Add a test that diffs each tier's `tools/` directory against
`expectedTaskToolNames({ parentToolNames, excludedParentTools })`, so a parent
tool added without a re-export (or a forgotten shim) fails CI instead of
shipping a child whose tool surface differs from what its description says.

Model blurbs come from the AI Gateway model catalog — the same public catalog
the AI SDK's `gateway.getAvailableModels()` reads — via
`fetchGatewayModelCatalog()` in a **one-shot refresh script**, and are checked
in. Never fetch them at agent build time: tool descriptions are part of the
cached prompt prefix and must be static and offline-safe.

Each catalog entry also carries the model's **`contextWindow`** (and
`maxOutputTokens`). Generate those into a checked-in map with the same
refresh-script motion: it's the number eve's `modelContextWindowTokens`
config needs when a wrapped model (a custom `createGateway` instance) defeats
eve's catalog auto-resolve, and the limit a chat client's context-usage meter
divides by — one generated source instead of hand-maintained constants that
go stale silently.

With [the media oracle](#the-media-oracle-look) wired, children keep their
sight: the child re-exports the parent's `look`, `read`, and `webfetch`
instances like every other ordinary tool. The tier description
deliberately says nothing about the pinned model's own media viewing — a
delegated child never receives media inline regardless of its model
(read/webfetch return metadata), so its media story is `look`, and a "this
tier can view images" line would misroute image-heavy work.

Finally, tell the parent when to route to each tier — pass a roster to the
stdlib and the `subagents` instruction grows a "Choosing a subagent" section:

```ts
const stdlib = createSandboxFileTools({
  // …
  subagentRoster: [
    { name: "task_fast", when: "quick, well-scoped subtasks on a fast, cheap model" },
    { name: "task_deep", when: "reasoning-heavy subtasks worth frontier-model cost" },
  ],
});
```

Instructions aren't inherited either — re-export the hosted-safe instructions
the child needs (`workflow`, `parallelTools`, and `media` when wired) beside
the task contract. Sandbox reads carry nested `AGENTS.md` riders; the hosted
composition omits process-local root injection. Same for hooks: if your agent logs sessions via a hook, re-export it
under `agent/subagents/task_fast/hooks/` or child sessions won't be recorded.

## Sandbox-backed file tools (split topologies)

Hosted agents run eve separately from their workspace. The standard
composition therefore routes file and command effects through the session's
remote sandbox (`ctx.getSandbox()`):

```ts
// agent/lib/file-tools.ts
import { createSandboxFileTools } from "@zocomputer/agent-sdk";

export const fileTools = createSandboxFileTools({
  workspaceRoot: "/workspace", // absolute path INSIDE the sandbox
  spillDir: "/workspace/.agent/tool-outputs", // grep overflow, readable by `read`
});
// then re-export fileTools.tools.read / edit / write / glob / grep per file,
// with disableTool() shims for eve's read_file/write_file (glob/grep shadow
// the built-ins by name), exactly like the Quick start.
```

Every effect routes through the session sandbox, resolved per tool call:
bytes over `readBinaryFile`/`writeBinaryFile`, stat/list/search executed
remotely via `run` (ripgrep when present, POSIX grep fallback) so a search
never pulls file contents over the wire. The rich-read pipeline (extraction,
media detection, metadata, `AGENTS.md` riders) is byte-identical to the
local backend — a shared conformance suite pins the two together. `bash` and
the task machinery stay host-side by design: on a sandboxed runtime, keep
eve's built-in `bash` (already sandbox-native).

Eve 0.22 supplies a required `ctx.callId` and `ctx.abortSignal` on every
authored tool execution. The SDK's structural context keeps both fields
required whenever a context is present: `callId` is the join key if a custom
tool records proposal/execution state, while the signal is bound into local
and sandbox file I/O, foreground shell commands, fetch/media calls, and task
waits. Detached background commands remain detached deliberately; cancelling
the turn stops waiting for them, not the work the tool explicitly moved out
of the turn.

Under the hood this is one seam: every file tool takes an `io:
WorkspaceIoProvider` (default local `node:fs`), and `createSandboxIo` /
`sandboxIoProvider` implement it over a structural `SandboxSessionLike` that
eve's `SandboxSession` satisfies. A custom backend (e.g. a bootstrap step
before first use) plugs in via `resolveSession`.

The factory also returns `instructions.stack` — the composed stack from
[The instruction stack](#the-instruction-stack), pre-configured for this
topology. Two baseline sections never render here: `repo-conventions` (the
workspace's root `AGENTS.md` lives in the sandbox, and eve's instruction
resolvers have no sandbox access — nested conventions still ride the read
tool's `directory_conventions` riders) and `parallel-tools` (this toolset
ships no SDK bash/tasks). Wire it as one `agent/instructions/stack.ts`
re-export exactly like the stdlib form; `instructionTier`,
`omitInstructionSections`, `extraInstructionSections`, `verifyCommandHint`,
and `subagentRoster` parameterize it through the factory's options.

## Gateway stream guards (surviving a dead connection)

Neither eve's `defineAgent` nor the AI SDK's gateway provider exposes
per-attempt timeouts, so a model call that hangs — response headers never
arrive, or the SSE body goes quiet mid-stream on a dropped connection —
hangs the turn forever. The one seam the provider does expose is `fetch`;
`withStreamGuards` (`@zocomputer/agent-sdk/gateway-fetch`) wraps it with the
two guards a streaming call needs:

- **first byte** — abort when response headers don't arrive in time;
- **idle** — abort when the response body goes quiet between chunks (a dead
  connection the TCP stack never surfaces).

Eve 0.22 retries classified transient failures reported inside a live provider
stream and no longer lets durable event writes block token flow. Those fixes do
not detect a connection that produces no headers or stops producing bytes. A
guard turns that silence into a network error for Eve/Workflow's recovery path
instead of waiting on a dead socket:

```ts
import { createGateway } from "ai";
import { withStreamGuards } from "@zocomputer/agent-sdk/gateway-fetch";

const gateway = createGateway({ fetch: withStreamGuards(fetch) });
export default defineAgent({ model: gateway("anthropic/claude-sonnet-5") });
```

The defaults (60s to first byte, 180s idle) are deliberately generous: the
point is converting a *dead* connection into a retryable error, not racing a
slow-but-alive reasoning model. Override via the second argument
(`{ firstByteMs, idleMs }`).

## Validated compaction (judge-and-repair summaries)

When a conversation outgrows the context window, eve compacts: the older
messages are replaced by a model-written summary, and nothing ever checks
that summary against what it deleted. Slipstream (arXiv:2605.08580) measured
the failure that invites: summaries silently drop load-bearing facts — the
task list, which files were already modified, the verification steps still
pending — and quality degrades with no visible error.
`withValidatedCompaction` (`@zocomputer/agent-sdk/validated-compaction`)
closes the loop at the model seam:

```ts
import { createGateway } from "ai";
import { withValidatedCompaction } from "@zocomputer/agent-sdk/validated-compaction";

const gateway = createGateway({ fetch: withStreamGuards(fetch) });
export default defineAgent({
  model: withValidatedCompaction(gateway("anthropic/claude-opus-4.8")),
  // A wrapped model instance forfeits eve's catalog window auto-resolution —
  // set the window explicitly or compilation fails.
  modelContextWindowTokens: 200_000,
});
```

How it works: eve's compaction is the only non-streaming (`doGenerate`) call
a turn model ever receives, and it announces itself with eve's summarizer
system prompt — the wrapper recognizes it, lets the summary generate, then
asks the **same model** to judge the candidate against the original
transcript (which travels inside the compaction call's own prompt). If the
judge names dropped facts, the wrapper appends a bounded
`## Recovered context (compaction audit)` section to the summary before eve
persists it; if nothing's missing, the summary passes through byte-identical.
One extra model call per compaction — a slight delay, traded for a summary
checked against ground truth.

Knobs (`ValidatedCompactionOptions`): `validationSystemPrompt` replaces the
judge prompt (the default asks for `- ` bullets or the literal
`NOTHING MISSING`; a custom prompt must keep that output contract),
`maxRecoveredFacts`/`maxRecoveredChars` bound the repair,
`judgeMaxOutputTokens`/`judgeTimeoutMs` bound the judge call, and
`onValidation` observes every verdict (a `CompactionValidationReport` — the
coder example appends them to an NDJSON file its eval suite asserts on).
Every failure mode fails open: a judge error, timeout, or unparseable
verdict degrades to the unvalidated summary, never a broken compaction.

Two wiring notes. First, wrap the **turn model** — eve has an authored
`compaction.model` knob, but it resolves back to the turn model before
compaction runs (a filed upstream bug; see
[`design/upstream-asks.md`](./design/upstream-asks.md)), so a wrapper there
never executes. Second, a bare string slug keeps eve's window auto-resolution
and gateway prompt caching, both of which a wrapped model instance forfeits —
so wrap a gateway *instance*, set `modelContextWindowTokens`, and (for a
plain `createGateway` wrap) re-enable caching via
`providerOptions: { gateway: { caching: "auto" } }`.

Eve 0.22 fixed direct Anthropic caching's final breakpoint so a fresh tool
result enters the cached prefix on the next request. That fix does not change
this wiring rule: a wrapped gateway model still needs gateway caching enabled
explicitly.

## Visible reasoning (the invisible-thinking gotcha)

`defineAgent`'s `reasoning` effort turns extended thinking ON, but on several
gateway models the thinking arrives HIDDEN by default: Anthropic's
adaptive-thinking generation (Sonnet 5, Opus 4.8, and newer) returns it
encrypted — the stream carries one reasoning delta per step with empty text
and only a signature — and Gemini omits thoughts entirely. The model pays the
full reasoning latency, eve emits empty `reasoning.appended` events, and the
UI never shows a "Thinking…" block, so the agent just looks stalled until the
first tool call. `visibleReasoningModelOptions(modelId)` returns the provider
options that make the thinking stream as visible text, and `undefined` for
models whose default already streams it (OpenAI, pre-adaptive Anthropic — for
which the adaptive options would be rejected):

```ts
import { visibleReasoningModelOptions } from "@zocomputer/agent-sdk";

const model = "anthropic/claude-opus-4.8";
const modelOptions = visibleReasoningModelOptions(model);
export default defineAgent({
  model,
  reasoning: "medium",
  ...(modelOptions ? { modelOptions } : {}),
});
```

`createTaskAgent` applies this automatically when its `model` is a slug
string (pass `modelOptions` to override). If you build `providerOptions`
yourself (prompt-caching directives, custom knobs), spread
`visibleReasoningModelOptions(modelId)?.providerOptions` into it. Also
exported at the dependency-free `@zocomputer/agent-sdk/visible-reasoning`
subpath.

### The provider landscape

Hidden-by-default is the exception. Surveyed live through the gateway
(2026-07-07, `reasoning: "medium"` unless noted) plus provider docs:

| Provider / family | Reasoning with plain `reasoning` effort | Convention |
| --- | --- | --- |
| Anthropic Fable 5, Mythos 5, Sonnet 5, Opus 4.7+ | **Hidden** — encrypted block, empty text | Thinking `display` defaults to `"omitted"` on these models; set `display: "summarized"` (what this module does). You're billed for thinking tokens either way. |
| Anthropic Sonnet/Opus 4.6 and older | Visible (summarized) | 4.5-and-older **reject** `thinking.type.adaptive` with a 400 — never send it to them. |
| Google Gemini 3 | **Hidden** — no reasoning parts at all | Needs `thinkingConfig: { includeThoughts: true }` (what this module does). Some older/lite Gemini models reject `include_thoughts`. |
| OpenAI GPT-5.x | Visible (summaries) | The gateway defaults `reasoningSummary`; on the native Responses API you'd set `reasoningSummary: "auto"` yourself. |
| xAI Grok 4.3 | Visible (summaries) | Older Grok models expose only encrypted reasoning content. |
| DeepSeek v4, Z.ai GLM 5.x, Moonshot Kimi K2.x, MiniMax M-series | Visible — often the FULL raw chain of thought (DeepSeek streamed 85k chars on one prompt) | The OpenAI-compatible `reasoning_content` convention; the gateway maps it to reasoning parts. Consider a UI that collapses long reasoning. |
| Alibaba Qwen | Visible when the model thinks | Hybrid-thinking family: `-thinking` variants and 3.6+ think; `qwen3-max` is a non-thinking model — the effort knob is a silent no-op. |
| Mistral Magistral | Visible | Always-thinking; the gateway warns the effort knob is unsupported (harmless). |
| Amazon Nova 2 | **The `reasoning` effort knob itself 400s** | The gateway maps effort to a `reasoningConfig` Bedrock rejects ("maxReasoningEffort is only allowed when type is 'enabled'"). Don't set `reasoning` on Nova models until the gateway fixes the mapping — this module can't help (the failure is the effort knob, not display). |
| Meta Llama | No reasoning | Effort knob silently ignored. |

Two structural takeaways. First, watch new Anthropic families: every family
since Opus 4.7 has shipped with `display` defaulting to `"omitted"`, so a new
family name (like `mythos`) needs adding to
`ANTHROPIC_ADAPTIVE_THINKING_MODELS` or the invisible-thinking regression
returns. Second, "reasoning didn't show" has three distinct causes worth
distinguishing when debugging: hidden output (Anthropic omitted / Gemini —
this module's job), a model that never reasons (Llama, qwen3-max — nothing to
show), and a rejected request (Nova's effort knob, adaptive on old Claude —
the call fails before any stream).

## Compile-time externals (fast cold boots)

eve compiles every authored module — each tool, hook, instruction, and
subagent — into its own bundle, and by default each bundle inlines this
package's whole dependency graph (`xlsx`, `mammoth`, `linkedom`, …). That's
the dominant cost of a cold `eve dev` boot or first turn: minutes on a slow
machine like a CI runner. `STDLIB_EXTERNAL_DEPENDENCIES` is the list to keep
external instead — packaging only, no behavior change; the same modules load
from `node_modules` at run time, and eve traces them into hosted build
output:

```ts
import { STDLIB_EXTERNAL_DEPENDENCIES } from "@zocomputer/agent-sdk";

export default defineAgent({
  model: "anthropic/claude-opus-4.8",
  build: { externalDependencies: [...STDLIB_EXTERNAL_DEPENDENCIES] },
});
```

Two rules make it work:

- **Your app must declare the same packages in its own `dependencies`.** An
  externalized import stays a bare specifier in the compiled bundle, which
  resolves from the app's `node_modules` — and under an isolating installer
  (bun's isolated linker, pnpm) the SDK's transitive deps aren't reachable
  from there. Mirror the versions this package pins.
- **Pass the list to every declared subagent too** (via
  `createTaskAgent({ build: ... })`): a subagent compiles with its own
  manifest config, so the parent's list doesn't reach it.

Append your agent's other heavy config-time imports (e.g. `"ai"` when
`agent.ts` builds a gateway) to the spread.

## Mock model (credential-free testing)

`createMockStoryModel()` is a scripted `LanguageModelV4` that turns the whole
eve stack into a deterministic test rig: session routes, the harness, framework
tools (`ask_question`, `todo`), declared subagents, and durable streams all run
REAL — only inference is canned. Gate it behind an env flag in `agent.ts` and
never set that flag in a normal run:

```ts
// agent/agent.ts
import { defineAgent } from "eve";
import { createMockStoryModel } from "@zocomputer/agent-sdk/testing";

export default function agent() {
  if (process.env.MY_AGENT_MOCK_MODEL === "1") {
    return defineAgent({ model: createMockStoryModel() });
  }
  return defineAgent({ model: "anthropic/claude-opus-4.8" });
}
```

A turn with no directive streams a long, paced deterministic story — a turn
that stays in-flight exactly as long as your test needs (`chunkCount` ×
`chunkDelayMs`), with the asking prompt echoed into the output so parallel
chats stay distinguishable. A `[mock:<scenario>]` directive in the user
message scripts the turn instead:

| Directive | What it drives |
| --- | --- |
| `[mock:hitl]` | One `ask_question` call (styled options + freeform) → park → answer → wrap-up. |
| `[mock:parallel]` | TWO `ask_question` calls in one response — both pend on a single park; one respond resumes. |
| `[mock:todo]` | Writes a 4-item todo list, then updates it (completed/cancelled), then wraps up. |
| `[mock:delegate]` | Delegates to a declared subagent (default tool name `task_fast` — requires one; see [Model-tier task subagents](#model-tier-task-subagents)). |
| `[mock:fail]` | A few deltas, then a terminal stream error — the deterministic failed-turn trigger. |
| `[mock:burst]` | `burstChunks` unpaced deltas — the renderer-throughput probe. |
| `[mock:markdown]` | Structure-heavy markdown split across deltas (fences, tables, unicode) — streaming-renderer stability. |
| `[mock:interleave]` | Alternating reasoning and text blocks in one message, like extended-thinking models stream. |
| `[mock:empty]` | A completion with zero content parts. |
| `[mock:recall]` | Echoes the prompt's `## Recovered context (compaction audit)` section (or says none was there) — the in-band probe for [validated compaction](#validated-compaction-judge-and-repair-summaries). |

Scripted tool inputs stream as fragmented `tool-input-delta` parts (like a
real model), each scripted step opens with a reasoning burst so "Thinking…"
renders, and every stream — including aborted ones — is grammatical (blocks
close, a terminal part ends the stream; pinned by the package's conformance
tests, which also validate the scripted `ask_question`/`todo` inputs against
the installed eve's own framework-tool schemas). Inject `now` for
byte-deterministic streams. Because the mock is credential-free, consumers
can build `eve eval` suites on it without provider credentials.

The mock's `doGenerate` is **compaction-aware**, so the validated-compaction
loop is testable without credentials too: eve's compaction call gets a
canned generic summary (guaranteed to drop anything specific), and the
default judge call gets a deterministic verdict — one bullet per
`[fact:<token>]` marker planted anywhere in the transcript, or
`NOTHING MISSING` when none are. Plant a fact in turn 1, force a compaction
(a tiny `modelContextWindowTokens`), then send `[mock:recall]` — if the
repaired summary reached the prompt, the reply names the token.

## Zo platform modules (`platform/`)

Everything above is the generic stdlib — nothing in it assumes Zo. The
published artifact additionally vendors the Zo platform packages under
`platform/`, exposed as subpath exports, so an agent deployed on Zo installs
its whole harness from this one dependency:

| Import | What it is |
| --- | --- |
| `@zocomputer/agent-sdk/sandbox` | `zoSandbox()` — the Zo sandbox backend for eve's `agent/sandbox.ts` slot. The runtime holds no provider key; it asks the Zo control plane (`ZO_API_URL`, authenticated by `ZO_AGENT_TOKEN`) for a scoped, short-lived SSH session. |
| `@zocomputer/agent-sdk/ai` (+ `/ai/gateway`, `/ai/register`, `/ai/session-fetch`) | The Zo AI provider layer. `import "@zocomputer/agent-sdk/ai/register"` (first in `agent.ts`) points the AI SDK's default provider at Zo's metering gateway so bare catalog model slugs work. |
| `@zocomputer/agent-sdk/cloud-tools` | Capability-aware batch media + search tools. Media subpaths are `/media-models`, `/image`, `/edit-image`, `/video`, `/edit-video`, `/generate-speech`, and `/transcribe-audio`; every paid tool resolves the latest accepted Gateway catalog profile and durable `files:` assets before calling a provider. Search subpaths are `/web-search` (Exa/Parallel/Perplexity via `/search-providers` discovery), `/x-search` (Grok's X search), and `/maps-search` (Gemini's Google Maps grounding); each runs a minimal driver-model call that forces the gateway- or provider-executed tool and returns bounded structured results. |
| `@zocomputer/agent-sdk/runtime-auth` | The agent-token contract (header/env names, mint/verify) shared with the Zo control plane. |

These modules assume Zo's control plane and are inert elsewhere; `ai` joins
`eve`/`zod` as a peer dependency (the `/ai/register` side effect must mutate
*your* `ai` instance), and `platform/agent-sandbox` brings `ssh2` (its native
addon is optional — the pure-JS fallback is fine).

In the [Zo monorepo](https://github.com/zocomputer/zov2-code) these are
separate workspace packages; the mirror sync composes them into this one
package so a deployed agent's `package.json` needs a single
`github:zocomputer/agent-sdk#<ref>` (or npm) dependency.

## Design rules

The full rationale — each foundational decision, why we made it, and the
prior art it came from (Claude Code, opencode, openclaw, hermes, pi, Cursor,
and Zo v1's hostagent) — lives in
[`design/foundation/`](./design/foundation/00-overview.md). The short
version:

- **Prompt-cache stability.** Tool descriptions and dynamic instructions are
  built once per session (`"session.started"`) and stay byte-identical
  thereafter; live state rides tool results, never a description. Options like
  `workspaceNoun` interpolate at build time.
- **Prior-aligned naming.** Tool names and parameters follow what models
  already know from Claude Code and opencode: lowercase `read`/`edit`/`write`/
  `glob`/`grep`/`bash`, snake_case params, `path` not `file_path`. Echo-back
  keys mirror the params that consume them (`task_id`).
- **Workspace-scoped.** Every file tool resolves paths inside
  `workspaceRoot` and refuses escapes.
- **Retry-friendly failures.** A rejected tool call is feedback the model
  corrects on: every error names what happened, states that nothing changed
  ("nothing was written/started"), and says exactly what to resend — never a
  raw fs/zod/regex error. Tools you add to an agent built on this SDK (the
  any consumer tool included) should follow the same shape.
- **No house types.** The package imports nothing repo-specific — plain
  discriminated unions, `eve` + `zod` as peers, WASM/pure-JS extraction deps
  (no native postinstalls).

Where eve has a gap the SDK works around (multimodal tool results, HITL
client replay, tool naming, a public turn-cancellation trigger, …), the
workaround lives app-side and
the gap becomes a written upstream ask: the maintained list is
[`design/upstream-asks.md`](./design/upstream-asks.md), and asks worked out
to PR precision — several with built, verified patches — live in
[`design/proposals/`](./design/proposals).
