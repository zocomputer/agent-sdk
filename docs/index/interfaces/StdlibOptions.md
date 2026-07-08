[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / StdlibOptions

# Interface: StdlibOptions

Defined in: [packages/agent-sdk/src/index.ts:47](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/index.ts#L47)

Options for building the stdlib: workspace root, state directory, display
noun, attachment/media settings, steering, subagent roster, and optional
extra backgroundable operations.

## Properties

### attachAudioToChat?

> `optional` **attachAudioToChat?**: `boolean`

Defined in: [packages/agent-sdk/src/index.ts:98](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/index.ts#L98)

Attach audio files (mp3/wav/ogg/flac/m4a). Same gating as video.

***

### attachImagesToChat?

> `optional` **attachImagesToChat?**: `boolean`

Defined in: [packages/agent-sdk/src/index.ts:79](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/index.ts#L79)

When `read` or `webfetch` hits an image, embed its bytes on the tool
result so a client can re-inject it as a viewable attachment on the next
turn (see ./attachments and GUIDE.md). Requires a client that consumes
the attachment (rib, Zo); generic eve consumers can leave this off and get
the metadata-only "ask the user" note. Defaults to `true`.

***

### attachVideoToChat?

> `optional` **attachVideoToChat?**: `boolean`

Defined in: [packages/agent-sdk/src/index.ts:96](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/index.ts#L96)

Attach video files (mp4/mov/webm/mkv/avi) the way images attach. Defaults
to `false`: video input is provider-gated (Gemini accepts it; Claude and
most others don't), and eve's attachment staging currently hydrates only
images/PDFs back into the model call (see design/upstream-asks.md) —
enable once both hold for your agent.

***

### bashInteractiveHint?

> `optional` **bashInteractiveHint?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:66](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/index.ts#L66)

Replaces bash's default "avoid interactive CLIs" warning — point it at
your agent's real-terminal tool if it has one.

***

### conventionsFileName?

> `optional` **conventionsFileName?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:119](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/index.ts#L119)

Conventions filename the read riders look for. Defaults to "AGENTS.md".

***

### extraBackgroundables?

> `optional` **extraBackgroundables?**: (`ctx`) => readonly [`BackgroundableOp`](BackgroundableOp.md)[]

Defined in: [packages/agent-sdk/src/index.ts:68](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/index.ts#L68)

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

### injectDirConventions?

> `optional` **injectDirConventions?**: `boolean`

Defined in: [packages/agent-sdk/src/index.ts:115](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/index.ts#L115)

Attach a directory's conventions file to the first `read` under it, once
per directory per session (see ./dir-conventions.ts). The root file is
excluded — `instructions.repoConventions` covers it. Defaults to `true`.

***

### maxInlineImageBytes?

> `optional` **maxInlineImageBytes?**: `number`

Defined in: [packages/agent-sdk/src/index.ts:88](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/index.ts#L88)

Max image size (bytes) to inline on the tool result; larger images fall
back to the metadata-only note. Defaults to 3 MiB — eve's attachment
staging inlines images up to that size at model-call time and text-stubs
bigger ones, so staying under it keeps the "queued" promise truthful.
Also bounds durable-stream bloat (the data URL rides the stream once per
read/fetch).

***

### maxInlineMediaBytes?

> `optional` **maxInlineMediaBytes?**: `number`

Defined in: [packages/agent-sdk/src/index.ts:104](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/index.ts#L104)

Max video/audio size (bytes) to inline on the tool result. Defaults to
10 MB (read's stat guard rejects bigger files outright; webfetch's 5 MB
response cap bites first for fetches).

***

### stateDir

> **stateDir**: `string`

Defined in: [packages/agent-sdk/src/index.ts:55](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/index.ts#L55)

Directory for the stdlib's local state: the background-task store
(`tasks.json`) and spilled oversized tool output (`tool-outputs/`).
Typically a gitignored dot-directory inside the workspace.

***

### steer?

> `optional` **steer?**: `object`

Defined in: [packages/agent-sdk/src/index.ts:127](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/index.ts#L127)

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

Defined in: [packages/agent-sdk/src/index.ts:133](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/index.ts#L133)

Declared subagents the delegation playbook should route work to (e.g. the
model-tier task preset — see ./task.ts). Grows `instructions.subagents`
with a "Choosing a subagent" section. Interpolated once at build time.

***

### verifyCommandHint?

> `optional` **verifyCommandHint?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:109](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/index.ts#L109)

Verify command mentioned by the workflow instruction (e.g. "bun run
check"). Interpolated once at build time; omit for a generic hint.

***

### workspaceNoun?

> `optional` **workspaceNoun?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:61](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/index.ts#L61)

What tool descriptions call the workspace — "repo" for a coding agent in a
git checkout, "project", … Defaults to "workspace". Interpolated once at
build time, so descriptions stay prompt-cache stable.

***

### workspaceRoot

> **workspaceRoot**: `string`

Defined in: [packages/agent-sdk/src/index.ts:49](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/index.ts#L49)

Directory the agent works in; file tools refuse paths that escape it.
