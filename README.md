# @zocomputer/agent-sdk

A standard library for [eve](https://eve.dev) agents that work on a real
filesystem: the workspace toolset (`read`, `edit`, `write`, `glob`, `grep`,
`bash`), background-task orchestration, and rich-filetype reads (PDF, DOCX,
spreadsheets), wired in one call.

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

One call wires everything:

```ts
// agent/lib/stdlib.ts
import { createStdlib } from "@zocomputer/agent-sdk";

export const stdlib = createStdlib({
  workspaceRoot: process.env.MY_WORKDIR ?? process.cwd(),
  stateDir: ".agent", // tasks.json + spilled oversized tool output
  workspaceNoun: "repo", // what tool descriptions call the workspace
});
```

Then re-export each tool from `agent/tools/<name>.ts` — in eve, the filename
is the wire name, so your agent keeps naming control:

```ts
// agent/tools/read.ts
import { stdlib } from "../lib/stdlib";
export default stdlib.tools.read;
```

```ts
// agent/tools/read_file.ts — vacate eve's built-in so the model sees ONE read
import { disableTool } from "eve/tools";
export default disableTool();
```

## What's included

- **`read`** — line-numbered windows over text, with content-sniffed filetype
  handling: PDF (PDFium via `clawpdf`, page markers, extraction page cap),
  DOCX (`mammoth`), and spreadsheets (`.xlsx`/`.xlsm`/`.xls`/`.ods` via
  SheetJS, TSV per sheet) convert to text; UTF-16 text is BOM-detected and
  decoded; images return metadata (format, dimensions) plus a hint to attach
  the image to the chat, since eve tool results are text/json-only (see the
  maintainer notes below). Formats with no extractor fail with a named,
  actionable error. Extraction is cached by path + stat identity.
- **`edit` / `write`** — exact-string replace (unique-match enforced,
  `replace_all` opt-in) and file creation with parent dirs.
- **`glob` / `grep`** — git-sourced file candidates (`git ls-files`) with a
  filesystem-walk fallback for non-repos, bounded result counts.
- **`bash`** — runs on the host workspace with a short foreground wait; a
  command still running after it returns a `task_id` and keeps going in the
  background. Oversized output spills to a file under `stateDir` instead of
  flooding the context window.
- **`run_async` / `check_tasks` / `await_task`** — background-task machinery
  over a persisted registry (survives agent restarts; tasks running across a
  restart report as `lost`). Any op defined with `defineOp` becomes
  `run_async`-able via `extraBackgroundables`.
- **Instructions** — `parallelTools` (the workflow guidance for the async
  tools) and `repoConventions` (injects the workspace's root `AGENTS.md` as a
  system-prompt section, since eve doesn't read it natively).

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

## Notes for the eve maintainers

Gaps we hit building this — each is something we'd rather see upstream than
keep working around:

- **Multimodal tool results.** `ToolModelOutput` is `text | json` only, so
  `read` can't return an image and instead returns metadata + "ask the user to
  attach it". `@workflow/ai`'s DurableAgent already merged multimodal
  tool-result pass-through (`type: "content"`, vercel/workflow#848 → #1385);
  exposing that through eve's tool surface would let `read` return real image
  blocks.
- **HITL replay.** eve persists `input.requested` but not the client's
  `input.responded`, so a replayed session reopens answered prompts as
  pending. We append synthetic responded-events from client-side storage;
  persisting the response (or accepting it into the durable stream) would fix
  every client at once.
- **Tool naming + config-level disable.** The built-ins ship off-prior names
  (`read_file`, `write_file`), and vacating one requires a `disableTool()`
  shim file per name. Prior-aligned defaults — or a config switch to disable
  built-ins wholesale — would remove the shims.
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
