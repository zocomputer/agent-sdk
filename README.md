# @zocomputer/agent-sdk

Batteries for [eve](https://eve.dev) agents that work on real files: the
workspace toolset (`read`, `edit`, `write`, `glob`, `grep`, `bash`,
`webfetch`), background tasks, and the instructions that teach a model to use
them well — wired up in one call.

We build [Zo](https://zo.computer), where published cloud agents run on eve.
This SDK is the toolset we give them, extracted from a coding agent we use on
our own repo every day. Nothing in it assumes Zo: every tool factory and
helper is exported à la carte, so any eve project can take the whole set or
just the pieces it wants.

## What's inside

- **File tools models already know.** Lowercase `read`/`edit`/`write`/`glob`/
  `grep`/`bash`, snake_case params — the names and shapes from Claude Code
  and opencode, so models use them correctly from the first turn.
- **Rich reads.** `read` handles PDFs, Office documents (DOCX/PPTX/ODT/ODP),
  spreadsheets, EPUB e-books, Jupyter notebooks, and RTF as text;
  reading an image puts the actual pixels in front of the model.
- **A media oracle for what your model can't see.** The opt-in `look` tool
  delegates one question about an image, PDF, video, or audio file to a
  pinned capable model (Gemini by default) and returns the answer as text —
  so a text-only model still gets media described, and any model gets video.
- **A bash that behaves.** Long commands auto-background instead of hanging
  the turn; oversized output spills to disk instead of flooding the context
  window.
- **Background tasks.** `run_async` / `check_tasks` / `await_task` let the
  model overlap independent work, then poll or await it explicitly.
- **Instructions included.** The workflow, communication, and
  human-in-the-loop prose that makes an agent behave well ships alongside the
  tools. Your agent's persona stays yours.
- **Validated compaction.** When eve summarizes an overlong conversation,
  a judge pass checks the summary against what it replaced and repairs
  silently dropped facts in place.
- **Credential-free testing.** A scripted mock model runs the entire eve
  stack deterministically — sessions, tools, streams — with zero API keys.

The [guide](./GUIDE.md) covers each subsystem in depth; the generated
[API reference](docs/README.md) covers every exported symbol (the `docs/`
directory exists only on the public mirror, not in the source monorepo).

## Install

```sh
bun add @zocomputer/agent-sdk
```

Or pin a release tag on this repo directly (each release is a `v<version>`
tag, matching the npm version):

```sh
bun add @zocomputer/agent-sdk@github:zocomputer/agent-sdk#v0.6.0
```

`eve`, `zod`, and `ai` are peer dependencies.

## Quick start

An eve agent is a folder of TypeScript files: eve auto-loads
`agent/tools/*.ts` and `agent/instructions/*.ts`, and each tool file's
**name is the wire name** the model sees. Build the sandbox-backed toolset
once, then add one tiny re-export file per tool.

**1. Build the toolset once:**

```ts
// agent/lib/stdlib.ts
import { createSandboxFileTools } from "@zocomputer/agent-sdk";

export const stdlib = createSandboxFileTools({
  workspaceRoot: "/workspace", // absolute path inside the session sandbox
  spillDir: "/workspace/.agent/tool-outputs",
  workspaceNoun: "repo", // what tool descriptions call the workspace
});
```

**2. Re-export each tool as its own file** under `agent/tools/` — `read.ts`,
`edit.ts`, `write.ts`, `glob.ts`, `grep.ts`, `bash.ts`, `webfetch.ts`:

```ts
// agent/tools/read.ts   (same one-liner for each of the others)
import { stdlib } from "../lib/stdlib";
export default stdlib.tools.read;
```

The background-task tools come as a bundle — one file exports all three
(`run_async`, `check_tasks`, `await_task`), so its own filename is free:

```ts
// agent/tools/tasks.ts
import { stdlib } from "../lib/stdlib";
export default stdlib.tools.tasks;
```

**3. Disable the eve built-ins you're replacing.** A same-named file (like
`bash.ts` above) overrides automatically; differently-named built-ins need a
shim so the model doesn't see two file readers:

```ts
// agent/tools/read_file.ts   (and agent/tools/write_file.ts)
import { disableTool } from "eve/tools";
export default disableTool();
```

**4. Register the instructions** — one file, the composed stack:

```ts
// agent/instructions/stack.ts
import { stdlib } from "../lib/stdlib";
export default stdlib.instructions.stack;
```

That's the SDK's whole baseline prompt (repo conventions, how to work,
planning, background tasks, delegation, asking, communicating) in its
deliberate section order — eve orders instruction files alphabetically, so
the one-file stack is what keeps the order intentional. See the
[instruction stack](./GUIDE.md#the-instruction-stack) for the sections, the
`compact` tier, and how to splice in your own sections or drop baseline ones.

That's the whole setup — `eve dev` and you have a working agent with the
full toolset. Everything is also exported à la carte (`createReadTool`,
`createCommandRunner`, …) if you'd rather compose a subset.

## Going deeper

The [guide](./GUIDE.md) documents each subsystem:

- [Tool behavior](./GUIDE.md#tool-behavior) — what each tool actually does
  beyond its boring name.
- [Media reads](./GUIDE.md#media-reads-images-video-audio) — how images
  reach the model, and the video/audio opt-ins.
- [The media oracle](./GUIDE.md#the-media-oracle-look) — delegating media
  the model can't view to a capable one with `look`.
- [Model-tier task subagents](./GUIDE.md#model-tier-task-subagents) —
  delegation workers pinned to cheaper or stronger models.
- [Sandbox-backed file tools](./GUIDE.md#sandbox-backed-file-tools-split-topologies)
  — the same tools when the workspace lives in a remote sandbox.
- [Gateway stream guards](./GUIDE.md#gateway-stream-guards-surviving-a-dead-connection)
  — surviving a model call whose connection dies.
- [Validated compaction](./GUIDE.md#validated-compaction-judge-and-repair-summaries)
  — auditing eve's compaction summaries and repairing dropped facts.
- [Mock model](./GUIDE.md#mock-model-credential-free-testing) — deterministic,
  credential-free end-to-end testing.
- [Zo platform modules](./GUIDE.md#zo-platform-modules-platform) — the extra
  subpath exports an agent deployed on Zo uses.

The design rationale — why the tools work this way, and the prior art they
come from — lives in [`design/foundation/`](./design/foundation/00-overview.md).
Gaps in eve we work around (and would love to see fixed upstream) are
tracked in [`design/upstream-asks.md`](./design/upstream-asks.md), several
worked out to patch precision in [`design/proposals/`](./design/proposals).

## License

[MIT](./LICENSE)
