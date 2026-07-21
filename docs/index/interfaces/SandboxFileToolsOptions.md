[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SandboxFileToolsOptions

# Interface: SandboxFileToolsOptions

Defined in: [packages/agent-sdk/src/index.ts:65](https://github.com/zocomputer/zov2-code/blob/fc65ac4f3ad029ed138ee11331693cba0bd295b4/packages/agent-sdk/src/index.ts#L65)

Options for the sandbox file tools: workspace root (inside the sandbox),
display noun, session resolver, spill dir, attachment/media settings, and
the instruction-stack knobs (tier, omit/extra sections, verify hint,
subagent roster).

## Properties

### additionalReadRoots?

> `optional` **additionalReadRoots?**: readonly `string`[]

Defined in: [packages/agent-sdk/src/index.ts:76](https://github.com/zocomputer/zov2-code/blob/fc65ac4f3ad029ed138ee11331693cba0bd295b4/packages/agent-sdk/src/index.ts#L76)

Absolute sandbox roots accepted by direct read surfaces (`read`, `look`,
and `grep` when scoped with `path`). Edit/write and unscoped searches stay
rooted at `workspaceRoot`.

***

### bashInteractiveHint?

> `optional` **bashInteractiveHint?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:102](https://github.com/zocomputer/zov2-code/blob/fc65ac4f3ad029ed138ee11331693cba0bd295b4/packages/agent-sdk/src/index.ts#L102)

Extra prompt text for interactive-command guidance.

***

### conventionsFileName?

> `optional` **conventionsFileName?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:106](https://github.com/zocomputer/zov2-code/blob/fc65ac4f3ad029ed138ee11331693cba0bd295b4/packages/agent-sdk/src/index.ts#L106)

Per-directory conventions filename. Defaults to "AGENTS.md".

***

### extraInstructionSections?

> `optional` **extraInstructionSections?**: readonly [`PlacedPromptSection`](PlacedPromptSection.md)[] \| (() => readonly [`PlacedPromptSection`](PlacedPromptSection.md)[])

Defined in: [packages/agent-sdk/src/index.ts:132](https://github.com/zocomputer/zov2-code/blob/fc65ac4f3ad029ed138ee11331693cba0bd295b4/packages/agent-sdk/src/index.ts#L132)

Consumer sections to place into the composed instruction stack.

***

### injectDirConventions?

> `optional` **injectDirConventions?**: `boolean`

Defined in: [packages/agent-sdk/src/index.ts:104](https://github.com/zocomputer/zov2-code/blob/fc65ac4f3ad029ed138ee11331693cba0bd295b4/packages/agent-sdk/src/index.ts#L104)

Whether reads inject per-directory conventions. Defaults to `true`.

***

### instructionTier?

> `optional` **instructionTier?**: [`InstructionTier`](../type-aliases/InstructionTier.md)

Defined in: [packages/agent-sdk/src/index.ts:124](https://github.com/zocomputer/zov2-code/blob/fc65ac4f3ad029ed138ee11331693cba0bd295b4/packages/agent-sdk/src/index.ts#L124)

Instruction depth.

***

### mediaOracle?

> `optional` **mediaOracle?**: [`MediaOracleOption`](../type-aliases/MediaOracleOption.md)

Defined in: [packages/agent-sdk/src/index.ts:113](https://github.com/zocomputer/zov2-code/blob/fc65ac4f3ad029ed138ee11331693cba0bd295b4/packages/agent-sdk/src/index.ts#L113)

Media-oracle configuration. The sandbox `look` reads bytes
through the sandbox session, so the oracle sees the session workspace's
files. Hosted Zo deployments pass `headers: { "x-zo-tool": "look" }` on
the config so the runtime proxy labels the tool's own model traffic.

***

### omitInstructionSections?

> `optional` **omitInstructionSections?**: readonly (`"repo-conventions"` \| `"workflow"` \| `"planning"` \| `"parallel-tools"` \| `"communication"` \| `"hitl"` \| `"media"` \| `"subagents"`)[]

Defined in: [packages/agent-sdk/src/index.ts:130](https://github.com/zocomputer/zov2-code/blob/fc65ac4f3ad029ed138ee11331693cba0bd295b4/packages/agent-sdk/src/index.ts#L130)

Further baseline sections `instructions.stack` should drop, by id — on
top of the sandbox topology's own omissions (see the `stack` doc on the
return value).

***

### parentCapabilities?

> `optional` **parentCapabilities?**: [`ModelInputCapabilities`](ModelInputCapabilities.md)

Defined in: [packages/agent-sdk/src/index.ts:118](https://github.com/zocomputer/zov2-code/blob/fc65ac4f3ad029ed138ee11331693cba0bd295b4/packages/agent-sdk/src/index.ts#L118)

The parent model's media input capabilities. This informs the stack's
media section (which kinds to view natively versus delegate).

***

### resolveSession?

> `optional` **resolveSession?**: (`ctx`) => `PromiseLike`\<[`SandboxSessionLike`](SandboxSessionLike.md)\>

Defined in: [packages/agent-sdk/src/index.ts:83](https://github.com/zocomputer/zov2-code/blob/fc65ac4f3ad029ed138ee11331693cba0bd295b4/packages/agent-sdk/src/index.ts#L83)

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

Defined in: [packages/agent-sdk/src/index.ts:90](https://github.com/zocomputer/zov2-code/blob/fc65ac4f3ad029ed138ee11331693cba0bd295b4/packages/agent-sdk/src/index.ts#L90)

Sandbox directory for oversized tool output: grep's overflow match lists
and bash's truncated command output (both spilled through the sandbox, so
the model's follow-up `read` can reach them). Omit to keep grep's
stop-at-cap behavior and bash's label-less truncation markers.

***

### subagentRoster?

> `optional` **subagentRoster?**: readonly [`SubagentRosterEntry`](SubagentRosterEntry.md)[]

Defined in: [packages/agent-sdk/src/index.ts:122](https://github.com/zocomputer/zov2-code/blob/fc65ac4f3ad029ed138ee11331693cba0bd295b4/packages/agent-sdk/src/index.ts#L122)

Declared subagents and their routing guidance.

***

### taskStorePath?

> `optional` **taskStorePath?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:100](https://github.com/zocomputer/zov2-code/blob/fc65ac4f3ad029ed138ee11331693cba0bd295b4/packages/agent-sdk/src/index.ts#L100)

Path **on the harness's local disk** for the background-task store
(task metadata + completed results, surviving an agent restart).
Defaults to a per-process path under the OS temp dir — fine for
serverless, where the store's lifetime matches the instance anyway;
agents on durable hosts pass a real state path. Keep it outside any
model-readable workspace and give it one active writer; this registry is
restart persistence, not a multi-process job coordinator.

***

### verifyCommandHint?

> `optional` **verifyCommandHint?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:120](https://github.com/zocomputer/zov2-code/blob/fc65ac4f3ad029ed138ee11331693cba0bd295b4/packages/agent-sdk/src/index.ts#L120)

Optional verification-command guidance for the workflow instruction.

***

### workspaceNoun?

> `optional` **workspaceNoun?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:78](https://github.com/zocomputer/zov2-code/blob/fc65ac4f3ad029ed138ee11331693cba0bd295b4/packages/agent-sdk/src/index.ts#L78)

What tool descriptions call the workspace. Defaults to "workspace".

***

### workspaceRoot

> **workspaceRoot**: `string`

Defined in: [packages/agent-sdk/src/index.ts:70](https://github.com/zocomputer/zov2-code/blob/fc65ac4f3ad029ed138ee11331693cba0bd295b4/packages/agent-sdk/src/index.ts#L70)

Absolute workspace root **inside the sandbox** (e.g. "/workspace").
File tools refuse paths that escape it.
