# @zocomputer/agent-sdk

A standard library for [eve](https://eve.dev) agents that work on a real
filesystem: the workspace toolset (`read`, `edit`, `write`, `glob`, `grep`,
`bash`, `webfetch`), background-task orchestration, and rich-filetype reads
(PDF, DOCX, spreadsheets), wired in one call.

We build [Zo](https://zo.computer), where published cloud agents run on eve —
this SDK is the toolset we give them, extracted from the coding agent we use
on our own repo. It's deliberately generic: nothing in it assumes Zo, and every
tool factory and helper module is exported à la carte for eve projects that
want a subset.

## Install

```sh
bun add @zocomputer/agent-sdk@github:zocomputer/agent-sdk#v0.4.0
```

Each release is a `v<version>` tag on this repo; pin one. (The npm publish
isn't bootstrapped yet — until it is, this repo is the registry.)

`eve`, `zod`, and `ai` are peer dependencies. Runtime imports load built JS
from `dist/` (Node won't load raw TS out of `node_modules`); types resolve
straight from the TypeScript source shipped alongside it.

## Quick start

eve auto-loads `agent/tools/*.ts` and `agent/instructions/*.ts` by filename —
the tool file's **name is the wire name** the model sees. So you build the
stdlib once, then add one tiny re-export file per tool. Steps 1–5 below are the
full prescription; copy it verbatim and you have the complete toolset.

### 1. Build the stdlib once

```ts
// agent/lib/stdlib.ts
import { createStdlib } from "@zocomputer/agent-sdk";

export const stdlib = createStdlib({
  workspaceRoot: process.env.MY_WORKDIR ?? process.cwd(),
  stateDir: ".agent", // tasks.json + spilled tool output — gitignore it
  workspaceNoun: "repo", // what tool descriptions call the workspace
});
```

### 2. Re-export each tool as its own file

One file per tool; the filename is the name the model calls. Create all of
these under `agent/tools/`:

```ts
// agent/tools/read.ts   (repeat for edit, write, glob, grep, bash, webfetch)
import { stdlib } from "../lib/stdlib";
export default stdlib.tools.read;
```

| file          | export                | model sees            |
| ------------- | --------------------- | --------------------- |
| `read.ts`     | `stdlib.tools.read`   | `read`                |
| `edit.ts`     | `stdlib.tools.edit`   | `edit`                |
| `write.ts`    | `stdlib.tools.write`  | `write`               |
| `glob.ts`     | `stdlib.tools.glob`   | `glob`                |
| `grep.ts`     | `stdlib.tools.grep`   | `grep`                |
| `bash.ts`     | `stdlib.tools.bash`   | `bash`                |
| `webfetch.ts` | `stdlib.tools.webfetch` | `webfetch`          |
| `tasks.ts`\*  | `stdlib.tools.tasks`  | `run_async`, `check_tasks`, `await_task` |

\* The task tools are a **bundle** — one file exports all three, so its own
filename is free (rib calls it `parallel.ts`):

```ts
// agent/tools/tasks.ts
import { stdlib } from "../lib/stdlib";
export default stdlib.tools.tasks; // run_async + check_tasks + await_task
```

### 3. Vacate the eve built-ins you're replacing

eve injects every built-in tool whose name you don't override or disable. The
rule:

- **Same name → automatic override.** `bash.ts` above already replaces eve's
  built-in `bash`; nothing else to do.
- **Different name → disable the built-in** so the model doesn't see two file
  readers/writers. The stdlib uses the Claude Code / opencode names (`read`,
  `write`), so shim out eve's `read_file` and `write_file`:

```ts
// agent/tools/read_file.ts   (and agent/tools/write_file.ts)
import { disableTool } from "eve/tools";
export default disableTool();
```

### 4. Register the instructions

The stdlib ships the operational prose alongside the tools — the workflow,
communication, and HITL contracts that make a coding agent behave well, not
just the file operations. One re-export file per instruction under
`agent/instructions/`:

```ts
// agent/instructions/workflow.ts — explore→read→edit→verify + the end-of-turn check
import { stdlib } from "../lib/stdlib";
export default stdlib.instructions.workflow;
```

| file                  | export                            | teaches                                             |
| --------------------- | --------------------------------- | --------------------------------------------------- |
| `workflow.ts`         | `stdlib.instructions.workflow`    | explore before edit, read before edit, verify, todo tracking, finish before ending the turn |
| `communication.ts`    | `stdlib.instructions.communication` | lead with the outcome, readable over brief, report-don't-fix, act without permission-seeking |
| `hitl.ts`             | `stdlib.instructions.hitl`        | the `ask_question` playbook — options, `style: "primary"`, `allowFreeform`, ask independent questions together |
| `parallel-tools.ts`   | `stdlib.instructions.parallelTools` | background tasks, `notify` watchers, await-before-ending |
| `repo-conventions.ts` | `stdlib.instructions.repoConventions` | injects the workspace's root `AGENTS.md`         |
| `subagents.ts`        | `stdlib.instructions.subagents`   | delegation with eve's built-in `agent` tool          |

Persona stays yours: the stdlib ships operational contracts, not voice — write
your agent's identity as your own instruction file (see the example's
`coder.ts`).

### 5. Register the park-delivery hook

One hook file makes `read` media actually reach the model (see
[Media reads](#media-reads-images-video-audio)) and delivers background-task
notifications (see [Tool behavior](#tool-behavior)):

```ts
// agent/hooks/park-delivery.ts
import { createParkDeliveryHook } from "@zocomputer/agent-sdk";
export default createParkDeliveryHook();
```

(If you enable [Steering](#steering-mid-turn-messages), pass the same inbox dir
here: `createParkDeliveryHook({ steer: { dir } })`.)

That's the whole setup. Everything is also exported à la carte
(`createReadTool`, `createCommandRunner`, …) if you'd rather compose a subset.

### 6. Optional: declare an explore subagent

A read-only child the parent can fan out aggressively for codebase questions —
cheap (give it a fast model), and safe by construction because it cannot
write. Declared under `agent/subagents/explore/`:

```ts
// agent/subagents/explore/agent.ts — the child's identity + fast model
import { createExploreAgent } from "@zocomputer/agent-sdk";
export default createExploreAgent({ model: "anthropic/claude-haiku-4.5" });

// agent/subagents/explore/instructions.ts — the child's operating contract
import { createExploreInstruction } from "@zocomputer/agent-sdk";
export default createExploreInstruction({ workspaceNoun: "repo" });

// agent/subagents/explore/tools/read.ts (and glob.ts, grep.ts)
import { exploreTools } from "../lib/explore-tools"; // your createExploreTools(...) instance
export default exploreTools.read;
```

**The critical part: a declared subagent inherits nothing from the root.** An
absent `tools/` slot falls back to eve's *framework defaults* — `bash`,
`write_file`, full write capability. Read-only must be constructed: besides
the three tools, ship a `disableTool()` shim for every entry in
`EXPLORE_DISABLED_BUILTINS` (`ask_question`, `bash`, `load_skill`,
`read_file`, `todo`, `web_fetch`, `web_search`, `write_file` — everything in
the default harness that writes, parks, or pads the one-question surface).
Do **not** shim the `agent` clone tool: eve injects it at the harness layer
rather than as a framework tool, so a shim for it fails runtime agent-graph
resolution and breaks every session; the explore instruction discourages
recursion instead (see the maintainers notes below):

```ts
// agent/subagents/explore/tools/bash.ts — one per disabled builtin
import { disableTool } from "eve/tools";
export default disableTool();
```

Add a test that diffs the `tools/` directory against
`EXPLORE_TOOL_NAMES` + `EXPLORE_DISABLED_BUILTINS`, so a forgotten shim (=
silently resurrected write capability) fails CI instead of shipping.

Finally, tell the parent when to route to it — pass a roster to the stdlib and
the `subagents` instruction grows a "Choosing a subagent" section:

```ts
const stdlib = createStdlib({
  // …
  subagentRoster: [
    { name: "explore", when: "read-only codebase questions — how/where/what — where you need an answer, not an edit" },
  ],
});
```

Hooks aren't inherited either: if your agent logs sessions via a hook, re-export
it under `agent/subagents/explore/hooks/` or child sessions won't be recorded.

## Example

[`examples/coder`](./examples/coder) is a complete, minimal eve coding agent
built on this stdlib — the five steps above as real files: the full toolset,
the `read_file`/`write_file` shims, the six instructions, the park-delivery
hook, and a one-file coder persona. Point it at a project and run it:

```sh
cd examples/coder
bun install
CODER_WORKDIR=/path/to/project AI_GATEWAY_API_KEY=… bun dev
```

## Tool behavior

The names are deliberately boring; the behavior behind them is the point:

- **`read`** is multi-format — line-numbered text windows plus content-sniffed
  PDF (PDFium via `clawpdf`), DOCX (`mammoth`), and spreadsheet (`.xlsx`/
  `.xlsm`/`.xls`/`.ods` via SheetJS, TSV per sheet) → text, and UTF-16 BOM
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
  that leaves raw HTML flags itself. Fetched PDFs/DOCX/spreadsheets route
  through the same extractors as `read` (`.pdf` URLs get a longer default
  timeout); images return metadata and attach to the chat like `read`;
  oversized bodies spill to `stateDir`.
- **`run_async` / `check_tasks` / `await_task`** persist the task registry
  across restarts (tasks running across a restart report as `lost`); any
  `defineOp` op becomes `run_async`-able via `extraBackgroundables`.
- **Background notifications**: `bash` and `run_async` take an optional
  `notify` watcher (`{ pattern, reason }`) — output lines matching the regex
  (debounced, capped) are delivered to the model as a message while the
  session is idle, instead of it polling `check_tasks`; `run_async` also takes
  `notify_on_complete` for a settle notice. Delivery rides the park-delivery
  hook (Quick start step 5): notifications queue until the session parks and
  then start its next turn, exactly like a user message.

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

## Media reads (images, video, audio)

eve tool results are text/json only, so `read` can't hand the model an image
directly. The workaround: for media under the inline cap, `read` embeds the
bytes as a `data:` URL on its **raw** result under a model-hidden field, and
its `toModelOutput` strips that field. The model sees only metadata + a note;
the **park-delivery hook** (`createParkDeliveryHook`, one file in
`agent/hooks/` — Quick start step 5) watches the runtime stream from inside
the agent's own server process and, when the session parks, sends the media
back into the session as a real user turn over loopback. The model sees the
pixels on its next turn with no browser, cockpit, or user action involved.
(The same hook delivers background-task notifications — see
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
  "Attached file …" text stub — see the eve-maintainer notes below). Until
  both hold, video/audio reads return honest metadata + a note steering to
  bash extraction (e.g. ffmpeg frames read back as images).
- `createParkDeliveryHook`'s `serverUrl` (defaults to loopback on `$PORT`, eve
  dev's 2000 otherwise) and `log`. An agent that skips the hook simply gets
  the metadata note (the bytes ride the stream unused — turn inlining off with
  `attachImagesToChat: false`).

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
  `createParkDeliveryHook({ steer: { dir } })` (Quick start step 5), leftovers
  start the session's next turn — delivered first, verbatim.
- **The wire contract is dependency-free at `@zocomputer/agent-sdk/steer`**
  (`STEER_FIELD`, `SteerMessage`, `readSteerMessages`, …), so UI clients can
  project delivered steers into user-message bubbles without pulling in the
  extraction deps.

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

## Notes for the eve maintainers

Gaps we hit building this — each is something we'd rather see upstream than
keep working around:

- **Multimodal tool results.** `ToolModelOutput` is `text | json` only, so
  `read` can't return an image directly — we work around it by smuggling the
  bytes past on the raw result and having a hook send them back as the next
  user turn (see [Media reads](#media-reads-images-video-audio)), which costs
  an extra turn and an extra copy of the bytes in the durable stream.
  `@workflow/ai`'s DurableAgent already merged multimodal tool-result
  pass-through (`type: "content"`, vercel/workflow#848 → #1385); exposing that
  through eve's tool surface would let `read` return real image blocks and
  delete the whole workaround. We've worked the design to change-list
  precision — including the storage-independent persistence policy (stub-first
  history + an in-process byte cache, so the model sees media the turn it read
  them and degrades gracefully to a text stub across process boundaries) and
  the per-provider degrade table it needs (Anthropic's tool-result converter
  warn-drops non-image/PDF media; OpenAI chat completions would stringify
  base64 — the opencode blowup) — in
  [`design/proposals/eve-content-tool-results.md`](./design/proposals/eve-content-tool-results.md).
- **Attachment hydration is image/PDF-only.** The staging pipeline
  (`attachment-staging.ts`) stages every inbound file part to the sandbox, but
  `shouldInlineSandboxRefAsBytes` re-inlines only `image/*` ≤3 MiB and
  `application/pdf` ≤20 MiB at model-call time — every other media type
  (video, audio) hydrates as an `Attached file …` text stub even when the
  session's model accepts it. That silently blocks video/audio delivery on any
  sandboxed runtime (the user-turn workaround included), while the AI SDK
  underneath is ready: `@ai-sdk/google` converts any file part to `inlineData`
  and Gemini natively takes video/audio (Anthropic's converter throws
  `UnsupportedFunctionalityError` on them, so a *blind* widening would turn
  today's stub into a failed model call). The fix that threads that needle is
  model-aware hydration — detect the provider family from the already-resolved
  model (the `detectPromptCachePath` idiom) and inline video/audio ≤20 MiB for
  the google family only, keeping the text-stub fallback for everyone else. We
  built and tested exactly that patch against `vercel/eve` (all suites green):
  the PR-grade writeup is
  [`design/proposals/eve-hydrate-model-aware-media.md`](./design/proposals/eve-hydrate-model-aware-media.md)
  and the DCO-signed patch sits beside it
  (`eve-hydrate-media-support.patch`), ready to submit once an identity with
  fork rights + verified commit signing picks it up. It would make `read`'s
  opt-in video/audio attachments (`attachVideoToChat`/`attachAudioToChat`)
  work end-to-end.
- **HITL replay.** eve persists `input.requested` but not the client's
  `input.responded`, so a replayed session reopens answered prompts as
  pending. We append synthetic responded-events from client-side storage;
  persisting the response (or accepting it into the durable stream) would fix
  every client at once.
- **`ask_question` multi-select.** The input-request contract carries rich
  options (`id`/`label`/`description`/`style`) but the response carries a
  single `optionId` — there's no way to ask "pick all that apply."
  `allowMultiple` on the request plus `optionIds` on the response would
  complete the surface; clients render checkboxes instead of buttons when
  it's set.
- **Tool naming + config-level disable.** The built-ins ship off-prior names
  (`read_file`, `write_file`), and vacating one requires a `disableTool()`
  shim file per name. Prior-aligned defaults — or a config switch to disable
  built-ins wholesale — would remove the shims.
- **No per-tool `strict` / `providerOptions` passthrough.** Anthropic's
  `strict: true` (grammar-constrained sampling — the documented fix for
  newer Claude models garbling off-prior tool schemas) is a per-tool flag
  the AI SDK already forwards to providers, but `buildToolSet` constructs
  `tool()` without it, so no eve agent can enable it. Accepting `strict`
  (and per-tool `providerOptions`) on `defineTool` and passing them through
  would make it a one-line opt-in; the change-list design is
  [`design/proposals/eve-strict-tool-passthrough.md`](./design/proposals/eve-strict-tool-passthrough.md).
  Same seam: `experimental_repairToolCall` is unwired.
- **Invalid tool calls never reach the event stream.** When a call fails
  schema validation the AI SDK marks it `invalid` and feeds the error back
  to the model, but `emitStreamContent` and `emitStepActions` both skip
  invalid calls — no event is emitted, so clients can't render the retry
  and harnesses can't measure schema-misuse rates (the regression newer
  Anthropic models show on off-prior schemas). An `action.invalid` event
  with the tool name and error class would close the gap; the change-list
  design is
  [`design/proposals/eve-invalid-tool-call-events.md`](./design/proposals/eve-invalid-tool-call-events.md).
- **`ask_question`'s options are the off-prior nested shape.** Its `options`
  array of `.strict()` option objects is exactly the shape newer Claude
  models garble (invented trailing keys after long strings), and it has no
  Claude Code analog to ride. Flattening it — or at least dropping
  `.strict()` so the advertised contract matches the (unvalidated) lenient
  runtime — would cut the schema-slop surface every HITL agent presents.
- **The `agent` clone tool can't be disabled.** It's injected at the harness
  layer (`createNodeHarnessTools`), not as a framework tool, so a
  `disableTool()` shim for it fails runtime agent-graph resolution — every
  session create 500s. A read-only child that should answer one question and
  return has no way to vacate recursive delegation; we fall back to
  instruction text. Either registering `agent` as a disableable framework
  tool or honoring the shim at the harness layer would close the gap.
- **Streaming events are quadratic.** `message.appended`/`reasoning.appended`
  carry the full text-so-far alongside each delta, so one turn's events sum
  to O(n²) bytes — a 3,000-delta turn measures ~330 MB of payloads, and
  late deltas re-send ~36 KB of prefix each. Clients that store or replay
  streams must compact/thin app-side (chat-core's `stream-thinning`);
  delta-only stream events would fix storage, replay, and live-wire
  throughput at the source.
- **An aborted stream resets the client session.** `advanceSession` carries
  the session forward only when the consumed stream ends on
  `session.waiting`; an abort (Stop/Esc) therefore erases the sessionId, and
  the next `send` silently creates a fresh session — forking the
  conversation. Preserving the session state across aborts (the id was
  known!) would remove a whole class of client-side recovery code.
- **No turn cancellation.** Aborting the client stream leaves the server-side
  turn running to completion; there's no API to actually stop it. Stop
  buttons today can only detach and re-attach.
- **Continuation-token scoping.** A hook's `ctx.channel.continuationToken` is
  the runtime-namespaced form (`eve:eve:<uuid>`), but `ClientSession.send`
  needs the client-facing token (`eve:<uuid>`) — and posting the namespaced
  form doesn't error, it **silently creates a new session** (the continue
  route's get-or-create). We strip the namespace (`clientContinuationToken`)
  and assert the echoed session id; either surfacing the client token on
  `HookContext` or rejecting unknown tokens on continue would remove the trap.
- **AGENTS.md ingestion.** eve injects no repo conventions; every other
  harness (Claude Code, Cursor, Codex) reads `AGENTS.md` natively. Our
  `repoConventions` instruction covers the root file, but first-class support
  belongs in the framework.
- **In-history tool-output pruning.** Old tool results stay in the model
  prompt verbatim for a session's lifetime. We bound tool output at the source
  (spill files, result caps); a framework-level pruning/compaction hook would
  do better.

## License

[MIT](./LICENSE)
