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
- **Rich reads.** `read` handles PDFs, DOCX, and spreadsheets as text;
  reading an image puts the actual pixels in front of the model.
- **A bash that behaves.** Long commands auto-background instead of hanging
  the turn; oversized output spills to disk instead of flooding the context
  window.
- **Background tasks.** `run_async` / `check_tasks` / `await_task`, plus
  regex watchers that notify the model when output matches — no polling.
- **Instructions included.** The workflow, communication, and
  human-in-the-loop prose that makes an agent behave well ships alongside the
  tools. Your agent's persona stays yours.
- **Mid-turn steering.** Deliver a user's "actually, stop doing that" into a
  running turn instead of after it.
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
bun add @zocomputer/agent-sdk@github:zocomputer/agent-sdk#v0.5.0
```

`eve`, `zod`, and `ai` are peer dependencies.

## Quick start

An eve agent is a folder of TypeScript files: eve auto-loads
`agent/tools/*.ts` and `agent/instructions/*.ts`, and each tool file's
**name is the wire name** the model sees. So you build the stdlib once, then
add one tiny re-export file per tool.

**1. Build the stdlib once:**

```ts
// agent/lib/stdlib.ts
import { createStdlib } from "@zocomputer/agent-sdk";

export const stdlib = createStdlib({
  workspaceRoot: process.env.MY_WORKDIR ?? process.cwd(),
  stateDir: ".agent", // task state + spilled tool output — gitignore it
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

**4. Register the instructions** — same pattern, one re-export file per
instruction under `agent/instructions/`:

```ts
// agent/instructions/workflow.ts
import { stdlib } from "../lib/stdlib";
export default stdlib.instructions.workflow;
```

Repeat for `communication`, `hitl`, `parallelTools`, `repoConventions`, and
`subagents` — see the [instruction stack](./GUIDE.md#the-instruction-stack)
for what each one teaches.

**5. Register the park-delivery hook**, which delivers images and
background-task notifications to the model:

```ts
// agent/hooks/park-delivery.ts
import { createParkDeliveryHook } from "@zocomputer/agent-sdk";
export default createParkDeliveryHook();
```

That's the whole setup — `eve dev` and you have a working agent with the
full toolset. Everything is also exported à la carte (`createReadTool`,
`createCommandRunner`, …) if you'd rather compose a subset.

## Try the example

[`examples/coder`](./examples/coder) is a complete, minimal coding agent
built exactly as prescribed above — real files you can copy. Point it at a
project and run it:

```sh
cd examples/coder
bun install
CODER_WORKDIR=/path/to/project AI_GATEWAY_API_KEY=… bun dev
```

It also doubles as the SDK's end-to-end test suite: `bun run eval` drives ten
deterministic scenarios through a real eve server on the
[mock model](./GUIDE.md#mock-model-credential-free-testing), with zero
credentials — a pattern worth copying for your own agent's CI.

## Going deeper

The [guide](./GUIDE.md) documents each subsystem:

- [Tool behavior](./GUIDE.md#tool-behavior) — what each tool actually does
  beyond its boring name.
- [Media reads](./GUIDE.md#media-reads-images-video-audio) — how images
  reach the model, and the video/audio opt-ins.
- [Steering](./GUIDE.md#steering-mid-turn-messages) — delivering user
  messages into a running turn.
- [Model-tier task subagents](./GUIDE.md#model-tier-task-subagents) —
  delegation workers pinned to cheaper or stronger models.
- [Sandbox-backed file tools](./GUIDE.md#sandbox-backed-file-tools-split-topologies)
  — the same tools when the workspace lives in a remote sandbox.
- [Gateway stream guards](./GUIDE.md#gateway-stream-guards-surviving-a-dead-connection)
  — surviving a model call whose connection dies.
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
