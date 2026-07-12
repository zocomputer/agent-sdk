[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / StdlibOptions

# Interface: StdlibOptions

Defined in: [packages/agent-sdk/src/index.ts:64](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/index.ts#L64)

Options for building the stdlib: workspace root, state directory, display
noun, media settings, steering, subagent roster, and optional
extra backgroundable operations.

## Properties

### bashInteractiveHint?

> `optional` **bashInteractiveHint?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:83](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/index.ts#L83)

Replaces bash's default "avoid interactive CLIs" warning — point it at
your agent's real-terminal tool if it has one.

***

### conventionsFileName?

> `optional` **conventionsFileName?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:121](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/index.ts#L121)

Conventions filename the read riders look for. Defaults to "AGENTS.md".

***

### extraBackgroundables?

> `optional` **extraBackgroundables?**: (`ctx`) => readonly [`BackgroundableOp`](BackgroundableOp.md)[]

Defined in: [packages/agent-sdk/src/index.ts:85](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/index.ts#L85)

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

Defined in: [packages/agent-sdk/src/index.ts:158](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/index.ts#L158)

Consumer-owned sections `instructions.stack` inserts at baseline anchors
(see [PlacedPromptSection](PlacedPromptSection.md)). Pass a function to defer building
until "session.started" — for sections that read the filesystem per
session (e.g. a skills catalog) while staying prompt-cache stable within
the session.

***

### injectDirConventions?

> `optional` **injectDirConventions?**: `boolean`

Defined in: [packages/agent-sdk/src/index.ts:117](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/index.ts#L117)

Attach a directory's conventions file to the first `read` under it, once
per directory per session (see ./dir-conventions.ts). The root file is
excluded — `instructions.repoConventions` covers it. Defaults to `true`.

***

### instructionTier?

> `optional` **instructionTier?**: [`InstructionTier`](../type-aliases/InstructionTier.md)

Defined in: [packages/agent-sdk/src/index.ts:144](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/index.ts#L144)

Prose depth for every instruction section: `"full"` (default, each rule
with its rationale) or `"compact"` (~⅓ the prose, same load-bearing rules
and tool names — for small/code-tuned models where a long behavioral
prompt crowds the context). Both tiers are generated from one source, so
they can't drift. Applies to `instructions.stack` and every à la carte
instruction.

***

### mediaOracle?

> `optional` **mediaOracle?**: [`MediaOracleOption`](../type-aliases/MediaOracleOption.md)

Defined in: [packages/agent-sdk/src/index.ts:106](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/index.ts#L106)

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

> `optional` **omitInstructionSections?**: readonly (`"subagents"` \| `"repo-conventions"` \| `"workflow"` \| `"planning"` \| `"parallel-tools"` \| `"communication"` \| `"hitl"` \| `"media"`)[]

Defined in: [packages/agent-sdk/src/index.ts:150](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/index.ts#L150)

Baseline sections `instructions.stack` should drop, by id (e.g. a
chat-only agent omitting `"subagents"`). À la carte instructions are
unaffected — simply don't wire the ones you don't want.

***

### parentCapabilities?

> `optional` **parentCapabilities?**: [`ModelInputCapabilities`](ModelInputCapabilities.md)

Defined in: [packages/agent-sdk/src/index.ts:95](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/index.ts#L95)

The session model's own input capabilities, resolved by the consumer
(`capabilitiesForModel` over the gateway catalog, checked in — see
./model-capabilities.ts). When provided, the look instruction states
which kinds the session model can view natively versus delegate.

***

### stateDir

> **stateDir**: `string`

Defined in: [packages/agent-sdk/src/index.ts:72](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/index.ts#L72)

Directory for the stdlib's local state: the background-task store
(`tasks.json`) and spilled oversized tool output (`tool-outputs/`).
Typically a gitignored dot-directory inside the workspace.

***

### steer?

> `optional` **steer?**: `object`

Defined in: [packages/agent-sdk/src/index.ts:129](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/index.ts#L129)

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

Defined in: [packages/agent-sdk/src/index.ts:135](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/index.ts#L135)

Declared subagents the delegation playbook should route work to (e.g. the
model-tier task preset — see ./task.ts). Grows `instructions.subagents`
with a "Choosing a subagent" section. Interpolated once at build time.

***

### verifyCommandHint?

> `optional` **verifyCommandHint?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:111](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/index.ts#L111)

Verify command mentioned by the workflow instruction (e.g. "bun run
check"). Interpolated once at build time; omit for a generic hint.

***

### workspaceNoun?

> `optional` **workspaceNoun?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:78](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/index.ts#L78)

What tool descriptions call the workspace — "repo" for a coding agent in a
git checkout, "project", … Defaults to "workspace". Interpolated once at
build time, so descriptions stay prompt-cache stable.

***

### workspaceRoot

> **workspaceRoot**: `string`

Defined in: [packages/agent-sdk/src/index.ts:66](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/index.ts#L66)

Directory the agent works in; file tools refuse paths that escape it.
