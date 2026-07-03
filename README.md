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
bun add @zocomputer/agent-sdk
# or: npm install @zocomputer/agent-sdk
```

`eve` and `zod` are peer dependencies. The package ships plain TypeScript (no
build step), matching how eve projects run.

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

One hook file makes `read` images actually reach the model (see
[Media reads](#media-reads-images)) and delivers background-task
notifications (see [Tool behavior](#tool-behavior)):

```ts
// agent/hooks/park-delivery.ts
import { createParkDeliveryHook } from "@zocomputer/agent-sdk";
export default createParkDeliveryHook();
```

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
`EXPLORE_DISABLED_BUILTINS` (`agent`, `ask_question`, `bash`, `load_skill`,
`read_file`, `todo`, `web_fetch`, `web_search`, `write_file` — everything in
the default harness that writes, parks, recurses, or pads the one-question
surface):

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
  as a viewable attachment on the next turn (see [Media reads](#media-reads-images)).
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

## Design rules

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

## Media reads (images)

eve tool results are text/json only, so `read` can't hand the model an image
directly. The workaround: for an image under `maxInlineImageBytes` (5 MB
default), `read` embeds the bytes as a `data:` URL on its **raw** result under a
model-hidden field, and its `toModelOutput` strips that field. The model sees
only metadata + a note; the **park-delivery hook** (`createParkDeliveryHook`,
one file in `agent/hooks/` — Quick start step 5) watches the runtime stream from
inside the agent's own server process and, when the session parks, sends the
images back into the session as a real user turn over loopback. The model sees
the pixels on its next turn with no browser, cockpit, or user action involved.
(The same hook delivers background-task notifications — see
[Tool behavior](#tool-behavior).)

- eve hooks are observe-only for model context, so the hook doesn't mutate the
  current turn — it starts the next one, exactly like a user hitting send.
  Delivery is deduped per tool call, retried briefly on a racing send, and
  re-queued for the next park if it still fails.
- The contract + a dependency-free reader live at
  **`@zocomputer/agent-sdk/attachments`** (`readImageChatAttachment(output)` →
  `ImageChatAttachment | null`), so UI clients that want to render or track the
  attachments import it without the extraction deps. The pure decision core
  (`redeliveryFromEvent`, `createRedeliveryState`, `buildRedeliveryMessage`) is
  exported for hosts that would rather run delivery elsewhere.
- Options: `createStdlib`'s `attachImagesToChat` (default `true`) and
  `maxInlineImageBytes` (default 5 MB; larger images fall back to the
  metadata-only "ask the user" note); `createParkDeliveryHook`'s `serverUrl`
  (defaults to loopback on `$PORT`, eve dev's 2000 otherwise) and `log`.
  An agent that skips the hook simply gets the metadata note (the bytes ride
  the stream unused — turn inlining off with `attachImagesToChat: false`).

## Notes for the eve maintainers

Gaps we hit building this — each is something we'd rather see upstream than
keep working around:

- **Multimodal tool results.** `ToolModelOutput` is `text | json` only, so
  `read` can't return an image directly — we work around it by smuggling the
  bytes past on the raw result and having a hook send them back as the next
  user turn (see [Media reads](#media-reads-images)), which costs an extra turn
  and an extra copy of the bytes in the durable stream. `@workflow/ai`'s
  DurableAgent already merged multimodal tool-result pass-through (`type: "content"`,
  vercel/workflow#848 → #1385); exposing that through eve's tool surface would
  let `read` return real image blocks and delete the whole workaround.
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
