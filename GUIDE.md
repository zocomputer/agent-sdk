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
| `tasks.ts`\*  | `stdlib.tools.tasks`    | `run_async`, `check_tasks`, `await_task` |

\* The task tools are a bundle — one file exports all three, so its own
filename is free.

eve injects every built-in tool whose name you don't override or disable:

- **Same name → automatic override.** `bash.ts` already replaces eve's
  built-in `bash`; nothing else to do.
- **Different name → disable the built-in** so the model doesn't see two
  file readers/writers. The stdlib uses the Claude Code / opencode names
  (`read`, `write`), so shim out eve's `read_file` and `write_file` with
  `disableTool()` files.

### The instruction stack

The stdlib ships the operational prose alongside the tools — the workflow,
communication, and HITL contracts that make an agent behave well, not just
the file operations. One re-export file per instruction under
`agent/instructions/`:

| file                  | export                                | teaches |
| --------------------- | ------------------------------------- | ------- |
| `workflow.ts`         | `stdlib.instructions.workflow`        | explore before edit, read before edit, verify, todo tracking, finish before ending the turn |
| `communication.ts`    | `stdlib.instructions.communication`   | lead with the outcome, readable over brief, report-don't-fix, act without permission-seeking |
| `hitl.ts`             | `stdlib.instructions.hitl`            | the `ask_question` playbook — options, `style: "primary"`, `allowFreeform`, ask independent questions together |
| `parallel-tools.ts`   | `stdlib.instructions.parallelTools`   | background tasks, `notify` watchers, await-before-ending |
| `repo-conventions.ts` | `stdlib.instructions.repoConventions` | injects the workspace's root `AGENTS.md` |
| `subagents.ts`        | `stdlib.instructions.subagents`       | delegation with eve's built-in `agent` tool |

Persona stays yours: the stdlib ships operational contracts, not voice —
write your agent's identity as your own instruction file (see the example's
`coder.ts`).

### The park-delivery hook

One hook file makes `read` media actually reach the model (see
[Media reads](#media-reads-images-video-audio)) and delivers background-task
notifications (see [Tool behavior](#tool-behavior)):

```ts
// agent/hooks/park-delivery.ts
import { createParkDeliveryHook } from "@zocomputer/agent-sdk";
export default createParkDeliveryHook();
```

If you enable [Steering](#steering-mid-turn-messages), pass the same inbox
dir here: `createParkDeliveryHook({ steer: { dir } })`. The hook's
`serverUrl` defaults to loopback on `$PORT` (eve dev's 2000 otherwise); an
agent that skips the hook simply gets metadata-only media notes.

## Tool behavior

The names are deliberately boring; the behavior behind them is the point:

- **`read`** is multi-format — line-numbered text windows plus content-sniffed
  document → text conversion: PDF (PDFium via `clawpdf`, per-page markers),
  DOCX (`mammoth`), PPTX (per-slide markers + speaker notes), ODT/ODP,
  spreadsheets (`.xlsx`/`.xlsm`/`.xls`/`.ods` via SheetJS, TSV per sheet),
  EPUB (spine order, per-section markers), Jupyter notebooks (per-cell
  markers, output stubs instead of base64 blobs), RTF, and UTF-16 BOM
  decode. Reading an **image** returns metadata and queues the pixels to appear
  as a viewable attachment on the next turn; **video/audio** reads return
  metadata (format, MIME type, bytes) and can queue the same way where the
  model supports it (see [Media reads](#media-reads-images-video-audio)).
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
  not unique / disproportionate). The matcher is exported standalone as
  `replaceForgiving` (`edit-match.ts`).
- **`write`** creates parent directories, and preserves an existing file's
  leading BOM when the new content omits it — a model rewriting a BOM'd file
  never strips the marker by accident.
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
  metadata and attach to the chat like `read`; oversized bodies spill to
  `stateDir`.
- **`run_async` / `check_tasks` / `await_task`** persist the task registry
  across restarts (tasks running across a restart report as `lost`); any
  `defineOp` op becomes `run_async`-able via `extraBackgroundables`.
- **Background notifications**: `bash` and `run_async` take an optional
  `notify` watcher (`{ pattern, reason }`) — output lines matching the regex
  (debounced, capped) are delivered to the model as a message while the
  session is idle, instead of it polling `check_tasks`; `run_async` also takes
  `notify_on_complete` for a settle notice. Delivery rides the park-delivery
  hook: notifications queue until the session parks and then start its next
  turn, exactly like a user message.

## Media reads (images, video, audio)

eve tool results are text/json only, so `read` can't hand the model an image
directly. The workaround: for media under the inline cap, `read` embeds the
bytes as a `data:` URL on its **raw** result under a model-hidden field, and
its `toModelOutput` strips that field. The model sees only metadata + a note;
the **park-delivery hook** watches the runtime stream from inside the agent's
own server process and, when the session parks, sends the media back into the
session as a real user turn over loopback. The model sees the pixels on its
next turn with no browser, cockpit, or user action involved. (The same hook
delivers background-task notifications — see
[Tool behavior](#tool-behavior).)

- eve hooks are observe-only for model context, so the hook doesn't mutate the
  current turn — it starts the next one, exactly like a user hitting send.
  Delivery is deduped per tool call, retried briefly on a racing send, and
  re-queued for the next park if it still fails.
- The contract + a dependency-free reader live at
  **`@zocomputer/agent-sdk/attachments`** (`readChatAttachment(output)` →
  `ChatAttachment | null`, kinds `image`/`video`/`audio`), so UI clients that
  want to render or track the attachments import it without the extraction
  deps. The pure decision core (`redeliveryFromEvent`, `createRedeliveryState`,
  `buildRedeliveryMessage`) is exported for hosts that would rather run
  delivery elsewhere.
- **Images** attach by default: `attachImagesToChat` (default `true`) and
  `maxInlineImageBytes` (default 3 MiB — eve's attachment staging inlines
  images up to that size at model-call time and text-stubs bigger ones, so the
  cap keeps the "queued" promise truthful; larger images fall back to the
  metadata-only "ask the user" note).
- **Video/audio are opt-in**: `attachVideoToChat` / `attachAudioToChat`
  (default `false`) and `maxInlineMediaBytes` (default 10 MB, read's stat
  guard). Two gates must hold before enabling them: your **model** takes that
  medium (Gemini accepts video/audio file parts; Claude and most others don't
  — an unsupported part fails the delivery turn), and your **runtime** passes
  them through (eve's attachment staging currently hydrates only images ≤3 MiB
  and PDFs ≤20 MiB back into the model call; anything else becomes an
  "Attached file …" text stub — see
  [`design/upstream-asks.md`](./design/upstream-asks.md)). Until
  both hold, video/audio reads return honest metadata + a note steering to
  bash extraction (e.g. ffmpeg frames read back as images).

## Steering (mid-turn messages)

eve queues a message sent to a busy session until the turn ends — hooks are
observe-only and a mid-turn `send()` is rejected, so there's no framework
channel into a running turn. The SDK's channel rides the tool results:

- **Enable it with `createStdlib({ steer: { dir } })`.** The stdlib builds a
  steer **inbox** — one NDJSON file per session under `dir` (exposed as
  `stdlib.steerInbox`) — and wraps every stdlib tool so a completing call
  drains the inbox and attaches the queued messages to its result under
  `user_steer`, with a note telling the model to adjust course now. On a long
  turn, `await_task` is the highest-value delivery window.
- **A UI queues a steer by appending to the inbox**:
  `createSteerInbox({ dir }).append(sessionId, text)`
  (`@zocomputer/agent-sdk/steer-inbox`), typically behind a small HTTP route.
  Drain-vs-append races are safe (rename-first drain).
- **Wrap your own tools** with `createSteerWrapper(stdlib.steerInbox)` (or
  `withSteerDelivery(tool, inbox)`) so they deliver steers too.
- **Messages that miss every tool window drain on park**: with
  `createParkDeliveryHook({ steer: { dir } })`, leftovers start the session's
  next turn — delivered first, verbatim.
- **The wire contract is dependency-free at `@zocomputer/agent-sdk/steer`**
  (`STEER_FIELD`, `SteerMessage`, `readSteerMessages`, …), so UI clients can
  project delivered steers into user-message bubbles without pulling in the
  extraction deps.

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

// agent/subagents/task_fast/tools/read.ts — EXCEPT read/webfetch, which use
// attach-disabled child instances: no park-delivery hook runs in a child, so
// the parent's attachment-enabled tools would promise media that never arrives
import { taskChildTools } from "../lib/child-tools"; // your createTaskChildTools(...) instance
export default taskChildTools.read;
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
breaks every session; the task instruction bounds onward delegation instead
(see [`design/upstream-asks.md`](./design/upstream-asks.md)):

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

Finally, tell the parent when to route to each tier — pass a roster to the
stdlib and the `subagents` instruction grows a "Choosing a subagent" section:

```ts
const stdlib = createStdlib({
  // …
  subagentRoster: [
    { name: "task_fast", when: "quick, well-scoped subtasks on a fast, cheap model" },
    { name: "task_deep", when: "reasoning-heavy subtasks worth frontier-model cost" },
  ],
});
```

Instructions aren't inherited either — re-export the stdlib instructions the
child needs (`repoConventions`, `workflow`, `parallelTools`) beside the task
contract. Same for hooks: if your agent logs sessions via a hook, re-export it
under `agent/subagents/task_fast/hooks/` or child sessions won't be recorded.

## Sandbox-backed file tools (split topologies)

`createStdlib`'s file tools do `node:fs` against the process's own disk —
right when the eve process and the workspace share a machine (a local coding
agent, the coder example). On a **split topology** — eve on a serverless
function, the workspace in a remote sandbox (`ctx.getSandbox()`) — that would
read the harness's filesystem, not the workspace. For that case the same
tools run over the sandbox session:

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
media detection, attachments, `AGENTS.md` riders) is byte-identical to the
local backend — a shared conformance suite pins the two together. `bash` and
the task machinery stay host-side by design: on a sandboxed runtime, keep
eve's built-in `bash` (already sandbox-native).

Under the hood this is one seam: every file tool takes an `io:
WorkspaceIoProvider` (default local `node:fs`), and `createSandboxIo` /
`sandboxIoProvider` implement it over a structural `SandboxSessionLike` that
eve's `SandboxSession` satisfies. A custom backend (e.g. a bootstrap step
before first use) plugs in via `resolveSession`.

One default flips versus `createStdlib`: `attachImagesToChat` is **false**
here. The attachment path needs the park-delivery hook and a runtime that can
send itself the next-turn message over loopback — unvalidated on hosted
serverless runtimes — so until a consumer wires and verifies that leg, image
reads return the honest metadata-only note instead of a "queued" promise that
never delivers.

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

A guard firing rejects like any network failure, so the AI SDK's normal
retry-with-backoff takes over instead of waiting on a dead socket:

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
import { createMockStoryModel } from "@zocomputer/agent-sdk";

export default function agent() {
  if (process.env.MY_AGENT_MOCK_MODEL === "1") {
    return defineAgent({ model: createMockStoryModel() });
  }
  return defineAgent({ model: "anthropic/claude-opus-4.8" });
}
```

(The coder example wires this as `CODER_MOCK_MODEL=1`.)

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

Scripted tool inputs stream as fragmented `tool-input-delta` parts (like a
real model), each scripted step opens with a reasoning burst so "Thinking…"
renders, and every stream — including aborted ones — is grammatical (blocks
close, a terminal part ends the stream; pinned by the package's conformance
tests, which also validate the scripted `ask_question`/`todo` inputs against
the installed eve's own framework-tool schemas). Inject `now` for
byte-deterministic streams. Because the mock is credential-free, `eve eval`
suites built on it can run end-to-end in CI — the coder example's
[`evals-mock/`](./examples/coder/evals-mock) suite (run via its
`scripts/eval.ts`) is the reference setup.

## Zo platform modules (`platform/`)

Everything above is the generic stdlib — nothing in it assumes Zo. The
published artifact additionally vendors the Zo platform packages under
`platform/`, exposed as subpath exports, so an agent deployed on Zo installs
its whole harness from this one dependency:

| Import | What it is |
| --- | --- |
| `@zocomputer/agent-sdk/sandbox` | `zoSandbox()` — the Zo sandbox backend for eve's `agent/sandbox.ts` slot. The runtime holds no provider key; it asks the Zo control plane (`ZO_API_URL`, authenticated by `ZO_AGENT_TOKEN`) for a scoped, short-lived SSH session. |
| `@zocomputer/agent-sdk/ai` (+ `/ai/gateway`, `/ai/register`, `/ai/session-fetch`) | The Zo AI provider layer. `import "@zocomputer/agent-sdk/ai/register"` (first in `agent.ts`) points the AI SDK's default provider at Zo's metering gateway so bare catalog model slugs work. |
| `@zocomputer/agent-sdk/cloud-tools` (+ `/image`, `/web-search`) | The default Zo cloud tools: `generate_image` and the Exa web-search factory, built on the gateway. |
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
- **No house types.** The package imports nothing repo-specific — plain
  discriminated unions, `eve` + `zod` as peers, WASM/pure-JS extraction deps
  (no native postinstalls).

Where eve has a gap the SDK works around (multimodal tool results, HITL
replay, tool naming, turn cancellation, …), the workaround lives app-side and
the gap becomes a written upstream ask: the maintained list is
[`design/upstream-asks.md`](./design/upstream-asks.md), and asks worked out
to PR precision — several with built, verified patches — live in
[`design/proposals/`](./design/proposals).
