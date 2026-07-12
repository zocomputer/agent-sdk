[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SandboxFileToolsOptions

# Interface: SandboxFileToolsOptions

Defined in: [packages/agent-sdk/src/index.ts:413](https://github.com/zocomputer/zov2-code/blob/3ac531f9ac263da198125b35b739171d97e53cac/packages/agent-sdk/src/index.ts#L413)

Options for the sandbox file tools: workspace root (inside the sandbox),
display noun, session resolver, spill dir, attachment/media settings, and
the instruction-stack knobs (tier, omit/extra sections, verify hint,
subagent roster).

## Properties

### attachAudioToChat?

> `optional` **attachAudioToChat?**: `boolean`

Defined in: [packages/agent-sdk/src/index.ts:467](https://github.com/zocomputer/zov2-code/blob/3ac531f9ac263da198125b35b739171d97e53cac/packages/agent-sdk/src/index.ts#L467)

See [StdlibOptions.attachAudioToChat](StdlibOptions.md#attachaudiotochat). Defaults to `false`.

***

### attachImagesToChat?

> `optional` **attachImagesToChat?**: `boolean`

Defined in: [packages/agent-sdk/src/index.ts:461](https://github.com/zocomputer/zov2-code/blob/3ac531f9ac263da198125b35b739171d97e53cac/packages/agent-sdk/src/index.ts#L461)

See [StdlibOptions.attachImagesToChat](StdlibOptions.md#attachimagestochat). Defaults to `false` here —
the attachment path only works when the agent registers
`createParkDeliveryHook` AND its runtime can reach itself over loopback
to send the next-turn message; hosted serverless runtimes haven't
validated that leg. Until a consumer wires and verifies it, the honest
default is the metadata-only note (a "queued" promise that never
delivers is the silent failure the attachment contract exists to avoid).

***

### attachVideoToChat?

> `optional` **attachVideoToChat?**: `boolean`

Defined in: [packages/agent-sdk/src/index.ts:465](https://github.com/zocomputer/zov2-code/blob/3ac531f9ac263da198125b35b739171d97e53cac/packages/agent-sdk/src/index.ts#L465)

See [StdlibOptions.attachVideoToChat](StdlibOptions.md#attachvideotochat). Defaults to `false`.

***

### bashInteractiveHint?

> `optional` **bashInteractiveHint?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:442](https://github.com/zocomputer/zov2-code/blob/3ac531f9ac263da198125b35b739171d97e53cac/packages/agent-sdk/src/index.ts#L442)

See [StdlibOptions.bashInteractiveHint](StdlibOptions.md#bashinteractivehint).

***

### conventionsFileName?

> `optional` **conventionsFileName?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:473](https://github.com/zocomputer/zov2-code/blob/3ac531f9ac263da198125b35b739171d97e53cac/packages/agent-sdk/src/index.ts#L473)

See [StdlibOptions.conventionsFileName](StdlibOptions.md#conventionsfilename). Defaults to "AGENTS.md".

***

### extraInstructionSections?

> `optional` **extraInstructionSections?**: readonly [`PlacedPromptSection`](PlacedPromptSection.md)[] \| (() => readonly [`PlacedPromptSection`](PlacedPromptSection.md)[])

Defined in: [packages/agent-sdk/src/index.ts:501](https://github.com/zocomputer/zov2-code/blob/3ac531f9ac263da198125b35b739171d97e53cac/packages/agent-sdk/src/index.ts#L501)

See [StdlibOptions.extraInstructionSections](StdlibOptions.md#extrainstructionsections).

***

### injectDirConventions?

> `optional` **injectDirConventions?**: `boolean`

Defined in: [packages/agent-sdk/src/index.ts:471](https://github.com/zocomputer/zov2-code/blob/3ac531f9ac263da198125b35b739171d97e53cac/packages/agent-sdk/src/index.ts#L471)

See [StdlibOptions.injectDirConventions](StdlibOptions.md#injectdirconventions). Defaults to `true`.

***

### instructionTier?

> `optional` **instructionTier?**: [`InstructionTier`](../type-aliases/InstructionTier.md)

Defined in: [packages/agent-sdk/src/index.ts:493](https://github.com/zocomputer/zov2-code/blob/3ac531f9ac263da198125b35b739171d97e53cac/packages/agent-sdk/src/index.ts#L493)

See [StdlibOptions.instructionTier](StdlibOptions.md#instructiontier).

***

### maxInlineImageBytes?

> `optional` **maxInlineImageBytes?**: `number`

Defined in: [packages/agent-sdk/src/index.ts:463](https://github.com/zocomputer/zov2-code/blob/3ac531f9ac263da198125b35b739171d97e53cac/packages/agent-sdk/src/index.ts#L463)

See [StdlibOptions.maxInlineImageBytes](StdlibOptions.md#maxinlineimagebytes).

***

### maxInlineMediaBytes?

> `optional` **maxInlineMediaBytes?**: `number`

Defined in: [packages/agent-sdk/src/index.ts:469](https://github.com/zocomputer/zov2-code/blob/3ac531f9ac263da198125b35b739171d97e53cac/packages/agent-sdk/src/index.ts#L469)

See [StdlibOptions.maxInlineMediaBytes](StdlibOptions.md#maxinlinemediabytes).

***

### mediaOracle?

> `optional` **mediaOracle?**: [`MediaOracleOption`](../type-aliases/MediaOracleOption.md)

Defined in: [packages/agent-sdk/src/index.ts:480](https://github.com/zocomputer/zov2-code/blob/3ac531f9ac263da198125b35b739171d97e53cac/packages/agent-sdk/src/index.ts#L480)

See [StdlibOptions.mediaOracle](StdlibOptions.md#mediaoracle). The sandbox `look` reads bytes
through the sandbox session, so the oracle sees the session workspace's
files. Hosted Zo deployments pass `headers: { "x-zo-tool": "look" }` on
the config so the runtime proxy labels the tool's own model traffic.

***

### notifications?

> `optional` **notifications?**: `boolean`

Defined in: [packages/agent-sdk/src/index.ts:451](https://github.com/zocomputer/zov2-code/blob/3ac531f9ac263da198125b35b739171d97e53cac/packages/agent-sdk/src/index.ts#L451)

Advertise + wire `notify` watchers on bash/run_async (default `false`
here, unlike the stdlib's `true`): watcher notifications ride
`createParkDeliveryHook`, and without that hook registered they queue
but never deliver — a promise the model would plan around. An agent
that wires park delivery flips this on. Same honesty precedent as
[SandboxFileToolsOptions.attachImagesToChat](#attachimagestochat).

***

### omitInstructionSections?

> `optional` **omitInstructionSections?**: readonly (`"subagents"` \| `"media"` \| `"repo-conventions"` \| `"workflow"` \| `"planning"` \| `"parallel-tools"` \| `"communication"` \| `"hitl"`)[]

Defined in: [packages/agent-sdk/src/index.ts:499](https://github.com/zocomputer/zov2-code/blob/3ac531f9ac263da198125b35b739171d97e53cac/packages/agent-sdk/src/index.ts#L499)

Further baseline sections `instructions.stack` should drop, by id — on
top of the sandbox topology's own omissions (see the `stack` doc on the
return value).

***

### parentCapabilities?

> `optional` **parentCapabilities?**: [`ModelInputCapabilities`](ModelInputCapabilities.md)

Defined in: [packages/agent-sdk/src/index.ts:487](https://github.com/zocomputer/zov2-code/blob/3ac531f9ac263da198125b35b739171d97e53cac/packages/agent-sdk/src/index.ts#L487)

See [StdlibOptions.parentCapabilities](StdlibOptions.md#parentcapabilities). Here it only informs the
stack's media section (which kinds to view natively vs delegate) — it
never drives an attachment default, since sandbox attachments stay
explicitly off (see [SandboxFileToolsOptions.attachImagesToChat](#attachimagestochat)).

***

### resolveSession?

> `optional` **resolveSession?**: (`ctx`) => `PromiseLike`\<[`SandboxSessionLike`](SandboxSessionLike.md)\>

Defined in: [packages/agent-sdk/src/index.ts:425](https://github.com/zocomputer/zov2-code/blob/3ac531f9ac263da198125b35b739171d97e53cac/packages/agent-sdk/src/index.ts#L425)

Resolves the sandbox session for one tool call. Defaults to
`ctx.getSandbox()`; injectable for tests.

#### Parameters

##### ctx

[`IoToolContext`](IoToolContext.md) \| `undefined`

#### Returns

`PromiseLike`\<[`SandboxSessionLike`](SandboxSessionLike.md)\>

***

### spillDir?

> `optional` **spillDir?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:432](https://github.com/zocomputer/zov2-code/blob/3ac531f9ac263da198125b35b739171d97e53cac/packages/agent-sdk/src/index.ts#L432)

Sandbox directory for oversized tool output: grep's overflow match lists
and bash's truncated command output (both spilled through the sandbox, so
the model's follow-up `read` can reach them). Omit to keep grep's
stop-at-cap behavior and bash's label-less truncation markers.

***

### subagentRoster?

> `optional` **subagentRoster?**: readonly [`SubagentRosterEntry`](SubagentRosterEntry.md)[]

Defined in: [packages/agent-sdk/src/index.ts:491](https://github.com/zocomputer/zov2-code/blob/3ac531f9ac263da198125b35b739171d97e53cac/packages/agent-sdk/src/index.ts#L491)

See [StdlibOptions.subagentRoster](StdlibOptions.md#subagentroster).

***

### taskStorePath?

> `optional` **taskStorePath?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:440](https://github.com/zocomputer/zov2-code/blob/3ac531f9ac263da198125b35b739171d97e53cac/packages/agent-sdk/src/index.ts#L440)

Path **on the harness's local disk** for the background-task store
(task metadata + completed results, surviving an agent restart).
Defaults to a per-process path under the OS temp dir — fine for
serverless, where the store's lifetime matches the instance anyway;
agents on durable hosts pass a real state path.

***

### verifyCommandHint?

> `optional` **verifyCommandHint?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:489](https://github.com/zocomputer/zov2-code/blob/3ac531f9ac263da198125b35b739171d97e53cac/packages/agent-sdk/src/index.ts#L489)

See [StdlibOptions.verifyCommandHint](StdlibOptions.md#verifycommandhint).

***

### workspaceNoun?

> `optional` **workspaceNoun?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:420](https://github.com/zocomputer/zov2-code/blob/3ac531f9ac263da198125b35b739171d97e53cac/packages/agent-sdk/src/index.ts#L420)

What tool descriptions call the workspace. Defaults to "workspace".

***

### workspaceRoot

> **workspaceRoot**: `string`

Defined in: [packages/agent-sdk/src/index.ts:418](https://github.com/zocomputer/zov2-code/blob/3ac531f9ac263da198125b35b739171d97e53cac/packages/agent-sdk/src/index.ts#L418)

Absolute workspace root **inside the sandbox** (e.g. "/workspace").
File tools refuse paths that escape it.
