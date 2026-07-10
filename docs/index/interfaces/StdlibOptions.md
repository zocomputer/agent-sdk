[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / StdlibOptions

# Interface: StdlibOptions

Defined in: [packages/agent-sdk/src/index.ts:68](https://github.com/zocomputer/zov2-code/blob/86e2b5a89599cc09df999181d86a1667b22c1929/packages/agent-sdk/src/index.ts#L68)

Options for building the stdlib: workspace root, state directory, display
noun, attachment/media settings, steering, subagent roster, and optional
extra backgroundable operations.

## Properties

### attachAudioToChat?

> `optional` **attachAudioToChat?**: `boolean`

Defined in: [packages/agent-sdk/src/index.ts:144](https://github.com/zocomputer/zov2-code/blob/86e2b5a89599cc09df999181d86a1667b22c1929/packages/agent-sdk/src/index.ts#L144)

Attach audio files (mp3/wav/ogg/flac/m4a). Same gating as video.

***

### attachImagesToChat?

> `optional` **attachImagesToChat?**: `boolean`

Defined in: [packages/agent-sdk/src/index.ts:103](https://github.com/zocomputer/zov2-code/blob/86e2b5a89599cc09df999181d86a1667b22c1929/packages/agent-sdk/src/index.ts#L103)

When `read` or `webfetch` hits an image, embed its bytes on the tool
result so a client can re-inject it as a viewable attachment on the next
turn (see ./attachments and GUIDE.md). Requires a client that consumes
the attachment (rib, Zo); generic eve consumers can leave this off and get
the metadata-only "ask the user" note. Defaults to `true` — or, when
[StdlibOptions.parentCapabilities](#parentcapabilities) is provided, to whether the
session model can view images (an image attached for a text-only model
fails the redelivery turn at the provider). An explicit value always wins.

***

### attachVideoToChat?

> `optional` **attachVideoToChat?**: `boolean`

Defined in: [packages/agent-sdk/src/index.ts:142](https://github.com/zocomputer/zov2-code/blob/86e2b5a89599cc09df999181d86a1667b22c1929/packages/agent-sdk/src/index.ts#L142)

Attach video files (mp4/mov/webm/mkv/avi) the way images attach. Defaults
to `false`: video input is provider-gated (Gemini accepts it; Claude and
most others don't), and eve's attachment staging currently hydrates only
images/PDFs back into the model call (see design/upstream-asks.md) —
enable once both hold for your agent.

***

### bashInteractiveHint?

> `optional` **bashInteractiveHint?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:87](https://github.com/zocomputer/zov2-code/blob/86e2b5a89599cc09df999181d86a1667b22c1929/packages/agent-sdk/src/index.ts#L87)

Replaces bash's default "avoid interactive CLIs" warning — point it at
your agent's real-terminal tool if it has one.

***

### conventionsFileName?

> `optional` **conventionsFileName?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:165](https://github.com/zocomputer/zov2-code/blob/86e2b5a89599cc09df999181d86a1667b22c1929/packages/agent-sdk/src/index.ts#L165)

Conventions filename the read riders look for. Defaults to "AGENTS.md".

***

### extraBackgroundables?

> `optional` **extraBackgroundables?**: (`ctx`) => readonly [`BackgroundableOp`](BackgroundableOp.md)[]

Defined in: [packages/agent-sdk/src/index.ts:89](https://github.com/zocomputer/zov2-code/blob/86e2b5a89599cc09df999181d86a1667b22c1929/packages/agent-sdk/src/index.ts#L89)

Extra run_async-able ops beyond bash (see defineOp).

#### Parameters

##### ctx

###### runner

[`CommandRunner`](CommandRunner.md)

###### workspace

[`Workspace`](Workspace.md)

#### Returns

readonly [`BackgroundableOp`](BackgroundableOp.md)[]

***

### extraInstructionSections?

> `optional` **extraInstructionSections?**: readonly [`PlacedPromptSection`](PlacedPromptSection.md)[] \| (() => readonly [`PlacedPromptSection`](PlacedPromptSection.md)[])

Defined in: [packages/agent-sdk/src/index.ts:202](https://github.com/zocomputer/zov2-code/blob/86e2b5a89599cc09df999181d86a1667b22c1929/packages/agent-sdk/src/index.ts#L202)

Consumer-owned sections `instructions.stack` inserts at baseline anchors
(see [PlacedPromptSection](PlacedPromptSection.md)). Pass a function to defer building
until "session.started" — for sections that read the filesystem per
session (e.g. a skills catalog) while staying prompt-cache stable within
the session.

***

### injectDirConventions?

> `optional` **injectDirConventions?**: `boolean`

Defined in: [packages/agent-sdk/src/index.ts:161](https://github.com/zocomputer/zov2-code/blob/86e2b5a89599cc09df999181d86a1667b22c1929/packages/agent-sdk/src/index.ts#L161)

Attach a directory's conventions file to the first `read` under it, once
per directory per session (see ./dir-conventions.ts). The root file is
excluded — `instructions.repoConventions` covers it. Defaults to `true`.

***

### instructionTier?

> `optional` **instructionTier?**: [`InstructionTier`](../type-aliases/InstructionTier.md)

Defined in: [packages/agent-sdk/src/index.ts:188](https://github.com/zocomputer/zov2-code/blob/86e2b5a89599cc09df999181d86a1667b22c1929/packages/agent-sdk/src/index.ts#L188)

Prose depth for every instruction section: `"full"` (default, each rule
with its rationale) or `"compact"` (~⅓ the prose, same load-bearing rules
and tool names — for small/code-tuned models where a long behavioral
prompt crowds the context). Both tiers are generated from one source, so
they can't drift. Applies to `instructions.stack` and every à la carte
instruction.

***

### maxInlineImageBytes?

> `optional` **maxInlineImageBytes?**: `number`

Defined in: [packages/agent-sdk/src/index.ts:134](https://github.com/zocomputer/zov2-code/blob/86e2b5a89599cc09df999181d86a1667b22c1929/packages/agent-sdk/src/index.ts#L134)

Max image size (bytes) to inline on the tool result; larger images fall
back to the metadata-only note. Defaults to 3 MiB — eve's attachment
staging inlines images up to that size at model-call time and text-stubs
bigger ones, so staying under it keeps the "queued" promise truthful.
Also bounds durable-stream bloat (the data URL rides the stream once per
read/fetch).

***

### maxInlineMediaBytes?

> `optional` **maxInlineMediaBytes?**: `number`

Defined in: [packages/agent-sdk/src/index.ts:150](https://github.com/zocomputer/zov2-code/blob/86e2b5a89599cc09df999181d86a1667b22c1929/packages/agent-sdk/src/index.ts#L150)

Max video/audio size (bytes) to inline on the tool result. Defaults to
10 MB (read's stat guard rejects bigger files outright; webfetch's 5 MB
response cap bites first for fetches).

***

### mediaOracle?

> `optional` **mediaOracle?**: [`MediaOracleOption`](../type-aliases/MediaOracleOption.md)

Defined in: [packages/agent-sdk/src/index.ts:125](https://github.com/zocomputer/zov2-code/blob/86e2b5a89599cc09df999181d86a1667b22c1929/packages/agent-sdk/src/index.ts#L125)

Wire the `look` media-oracle tool: delegate one question about a media
file the session model can't view to a pinned capable model. `true`
selects the recommended default oracle (`DEFAULT_MEDIA_ORACLE` —
Gemini 3 Flash, the one family covering images, PDFs, video, AND audio);
pass a [LookOracleConfig](LookOracleConfig.md) to pin a different model or add metered
headers. When set, `tools.look` exists, `instructions.media` carries the
routing playbook, and read/webfetch's unavailable-media hints route to
`look` instead of dead-ending.

***

### omitInstructionSections?

> `optional` **omitInstructionSections?**: readonly (`"subagents"` \| `"media"` \| `"repo-conventions"` \| `"workflow"` \| `"planning"` \| `"parallel-tools"` \| `"communication"` \| `"hitl"`)[]

Defined in: [packages/agent-sdk/src/index.ts:194](https://github.com/zocomputer/zov2-code/blob/86e2b5a89599cc09df999181d86a1667b22c1929/packages/agent-sdk/src/index.ts#L194)

Baseline sections `instructions.stack` should drop, by id (e.g. a
chat-only agent omitting `"subagents"`). À la carte instructions are
unaffected — simply don't wire the ones you don't want.

***

### parentCapabilities?

> `optional` **parentCapabilities?**: [`ModelInputCapabilities`](ModelInputCapabilities.md)

Defined in: [packages/agent-sdk/src/index.ts:114](https://github.com/zocomputer/zov2-code/blob/86e2b5a89599cc09df999181d86a1667b22c1929/packages/agent-sdk/src/index.ts#L114)

The session model's own input capabilities, resolved by the consumer
(`capabilitiesForModel` over the gateway catalog, checked in — see
./model-capabilities.ts). When provided, `attachImagesToChat` defaults to
`parentCapabilities.image`, and the look instruction (when the oracle is
wired) states which kinds to view natively vs delegate. Video/audio
attach stays manual opt-in regardless: eve's attachment hydration stubs
both for every model today (see design/upstream-asks.md), so a
capability-derived default would promise media the runtime won't deliver.

***

### stateDir

> **stateDir**: `string`

Defined in: [packages/agent-sdk/src/index.ts:76](https://github.com/zocomputer/zov2-code/blob/86e2b5a89599cc09df999181d86a1667b22c1929/packages/agent-sdk/src/index.ts#L76)

Directory for the stdlib's local state: the background-task store
(`tasks.json`) and spilled oversized tool output (`tool-outputs/`).
Typically a gitignored dot-directory inside the workspace.

***

### steer?

> `optional` **steer?**: `object`

Defined in: [packages/agent-sdk/src/index.ts:173](https://github.com/zocomputer/zov2-code/blob/86e2b5a89599cc09df999181d86a1667b22c1929/packages/agent-sdk/src/index.ts#L173)

Enable steering: a directory (typically under `stateDir`) where UI
clients queue mid-turn messages (see ./steer-inbox). Every stdlib tool is
wrapped so queued messages ride the next completing tool result; pass the
same dir to `createParkDeliveryHook({ steer })` so messages a turn ends
before delivering go out on park instead.

#### dir

> **dir**: `string`

***

### subagentRoster?

> `optional` **subagentRoster?**: readonly [`SubagentRosterEntry`](SubagentRosterEntry.md)[]

Defined in: [packages/agent-sdk/src/index.ts:179](https://github.com/zocomputer/zov2-code/blob/86e2b5a89599cc09df999181d86a1667b22c1929/packages/agent-sdk/src/index.ts#L179)

Declared subagents the delegation playbook should route work to (e.g. the
model-tier task preset — see ./task.ts). Grows `instructions.subagents`
with a "Choosing a subagent" section. Interpolated once at build time.

***

### verifyCommandHint?

> `optional` **verifyCommandHint?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:155](https://github.com/zocomputer/zov2-code/blob/86e2b5a89599cc09df999181d86a1667b22c1929/packages/agent-sdk/src/index.ts#L155)

Verify command mentioned by the workflow instruction (e.g. "bun run
check"). Interpolated once at build time; omit for a generic hint.

***

### workspaceNoun?

> `optional` **workspaceNoun?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:82](https://github.com/zocomputer/zov2-code/blob/86e2b5a89599cc09df999181d86a1667b22c1929/packages/agent-sdk/src/index.ts#L82)

What tool descriptions call the workspace — "repo" for a coding agent in a
git checkout, "project", … Defaults to "workspace". Interpolated once at
build time, so descriptions stay prompt-cache stable.

***

### workspaceRoot

> **workspaceRoot**: `string`

Defined in: [packages/agent-sdk/src/index.ts:70](https://github.com/zocomputer/zov2-code/blob/86e2b5a89599cc09df999181d86a1667b22c1929/packages/agent-sdk/src/index.ts#L70)

Directory the agent works in; file tools refuse paths that escape it.
