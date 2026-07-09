[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SandboxFileToolsOptions

# Interface: SandboxFileToolsOptions

Defined in: [packages/agent-sdk/src/index.ts:411](https://github.com/zocomputer/zov2-code/blob/f16d57089a60328b9900d1483bcd363cd844b8b3/packages/agent-sdk/src/index.ts#L411)

Options for the sandbox file tools: workspace root (inside the sandbox),
display noun, session resolver, spill dir, attachment/media settings, and
the instruction-stack knobs (tier, omit/extra sections, verify hint,
subagent roster).

## Properties

### attachAudioToChat?

> `optional` **attachAudioToChat?**: `boolean`

Defined in: [packages/agent-sdk/src/index.ts:445](https://github.com/zocomputer/zov2-code/blob/f16d57089a60328b9900d1483bcd363cd844b8b3/packages/agent-sdk/src/index.ts#L445)

See [StdlibOptions.attachAudioToChat](StdlibOptions.md#attachaudiotochat). Defaults to `false`.

***

### attachImagesToChat?

> `optional` **attachImagesToChat?**: `boolean`

Defined in: [packages/agent-sdk/src/index.ts:439](https://github.com/zocomputer/zov2-code/blob/f16d57089a60328b9900d1483bcd363cd844b8b3/packages/agent-sdk/src/index.ts#L439)

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

Defined in: [packages/agent-sdk/src/index.ts:443](https://github.com/zocomputer/zov2-code/blob/f16d57089a60328b9900d1483bcd363cd844b8b3/packages/agent-sdk/src/index.ts#L443)

See [StdlibOptions.attachVideoToChat](StdlibOptions.md#attachvideotochat). Defaults to `false`.

***

### conventionsFileName?

> `optional` **conventionsFileName?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:451](https://github.com/zocomputer/zov2-code/blob/f16d57089a60328b9900d1483bcd363cd844b8b3/packages/agent-sdk/src/index.ts#L451)

See [StdlibOptions.conventionsFileName](StdlibOptions.md#conventionsfilename). Defaults to "AGENTS.md".

***

### extraInstructionSections?

> `optional` **extraInstructionSections?**: readonly [`PlacedPromptSection`](PlacedPromptSection.md)[] \| (() => readonly [`PlacedPromptSection`](PlacedPromptSection.md)[])

Defined in: [packages/agent-sdk/src/index.ts:479](https://github.com/zocomputer/zov2-code/blob/f16d57089a60328b9900d1483bcd363cd844b8b3/packages/agent-sdk/src/index.ts#L479)

See [StdlibOptions.extraInstructionSections](StdlibOptions.md#extrainstructionsections).

***

### injectDirConventions?

> `optional` **injectDirConventions?**: `boolean`

Defined in: [packages/agent-sdk/src/index.ts:449](https://github.com/zocomputer/zov2-code/blob/f16d57089a60328b9900d1483bcd363cd844b8b3/packages/agent-sdk/src/index.ts#L449)

See [StdlibOptions.injectDirConventions](StdlibOptions.md#injectdirconventions). Defaults to `true`.

***

### instructionTier?

> `optional` **instructionTier?**: [`InstructionTier`](../type-aliases/InstructionTier.md)

Defined in: [packages/agent-sdk/src/index.ts:471](https://github.com/zocomputer/zov2-code/blob/f16d57089a60328b9900d1483bcd363cd844b8b3/packages/agent-sdk/src/index.ts#L471)

See [StdlibOptions.instructionTier](StdlibOptions.md#instructiontier).

***

### maxInlineImageBytes?

> `optional` **maxInlineImageBytes?**: `number`

Defined in: [packages/agent-sdk/src/index.ts:441](https://github.com/zocomputer/zov2-code/blob/f16d57089a60328b9900d1483bcd363cd844b8b3/packages/agent-sdk/src/index.ts#L441)

See [StdlibOptions.maxInlineImageBytes](StdlibOptions.md#maxinlineimagebytes).

***

### maxInlineMediaBytes?

> `optional` **maxInlineMediaBytes?**: `number`

Defined in: [packages/agent-sdk/src/index.ts:447](https://github.com/zocomputer/zov2-code/blob/f16d57089a60328b9900d1483bcd363cd844b8b3/packages/agent-sdk/src/index.ts#L447)

See [StdlibOptions.maxInlineMediaBytes](StdlibOptions.md#maxinlinemediabytes).

***

### mediaOracle?

> `optional` **mediaOracle?**: [`MediaOracleOption`](../type-aliases/MediaOracleOption.md)

Defined in: [packages/agent-sdk/src/index.ts:458](https://github.com/zocomputer/zov2-code/blob/f16d57089a60328b9900d1483bcd363cd844b8b3/packages/agent-sdk/src/index.ts#L458)

See [StdlibOptions.mediaOracle](StdlibOptions.md#mediaoracle). The sandbox `look` reads bytes
through the sandbox session, so the oracle sees the session workspace's
files. Hosted Zo deployments pass `headers: { "x-zo-tool": "look" }` on
the config so the runtime proxy labels the tool's own model traffic.

***

### omitInstructionSections?

> `optional` **omitInstructionSections?**: readonly (`"subagents"` \| `"media"` \| `"repo-conventions"` \| `"workflow"` \| `"planning"` \| `"parallel-tools"` \| `"communication"` \| `"hitl"`)[]

Defined in: [packages/agent-sdk/src/index.ts:477](https://github.com/zocomputer/zov2-code/blob/f16d57089a60328b9900d1483bcd363cd844b8b3/packages/agent-sdk/src/index.ts#L477)

Further baseline sections `instructions.stack` should drop, by id — on
top of the sandbox topology's own omissions (see the `stack` doc on the
return value).

***

### parentCapabilities?

> `optional` **parentCapabilities?**: [`ModelInputCapabilities`](ModelInputCapabilities.md)

Defined in: [packages/agent-sdk/src/index.ts:465](https://github.com/zocomputer/zov2-code/blob/f16d57089a60328b9900d1483bcd363cd844b8b3/packages/agent-sdk/src/index.ts#L465)

See [StdlibOptions.parentCapabilities](StdlibOptions.md#parentcapabilities). Here it only informs the
stack's media section (which kinds to view natively vs delegate) — it
never drives an attachment default, since sandbox attachments stay
explicitly off (see [SandboxFileToolsOptions.attachImagesToChat](#attachimagestochat)).

***

### resolveSession?

> `optional` **resolveSession?**: (`ctx`) => `PromiseLike`\<[`SandboxSessionLike`](SandboxSessionLike.md)\>

Defined in: [packages/agent-sdk/src/index.ts:423](https://github.com/zocomputer/zov2-code/blob/f16d57089a60328b9900d1483bcd363cd844b8b3/packages/agent-sdk/src/index.ts#L423)

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

Defined in: [packages/agent-sdk/src/index.ts:429](https://github.com/zocomputer/zov2-code/blob/f16d57089a60328b9900d1483bcd363cd844b8b3/packages/agent-sdk/src/index.ts#L429)

Sandbox directory for grep's overflow match lists (spilled through the
sandbox, so the model's follow-up `read` can reach them). Omit to keep
the stop-at-cap behavior.

***

### subagentRoster?

> `optional` **subagentRoster?**: readonly [`SubagentRosterEntry`](SubagentRosterEntry.md)[]

Defined in: [packages/agent-sdk/src/index.ts:469](https://github.com/zocomputer/zov2-code/blob/f16d57089a60328b9900d1483bcd363cd844b8b3/packages/agent-sdk/src/index.ts#L469)

See [StdlibOptions.subagentRoster](StdlibOptions.md#subagentroster).

***

### verifyCommandHint?

> `optional` **verifyCommandHint?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:467](https://github.com/zocomputer/zov2-code/blob/f16d57089a60328b9900d1483bcd363cd844b8b3/packages/agent-sdk/src/index.ts#L467)

See [StdlibOptions.verifyCommandHint](StdlibOptions.md#verifycommandhint).

***

### workspaceNoun?

> `optional` **workspaceNoun?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:418](https://github.com/zocomputer/zov2-code/blob/f16d57089a60328b9900d1483bcd363cd844b8b3/packages/agent-sdk/src/index.ts#L418)

What tool descriptions call the workspace. Defaults to "workspace".

***

### workspaceRoot

> **workspaceRoot**: `string`

Defined in: [packages/agent-sdk/src/index.ts:416](https://github.com/zocomputer/zov2-code/blob/f16d57089a60328b9900d1483bcd363cd844b8b3/packages/agent-sdk/src/index.ts#L416)

Absolute workspace root **inside the sandbox** (e.g. "/workspace").
File tools refuse paths that escape it.
