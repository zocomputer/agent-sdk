[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SandboxFileToolsOptions

# Interface: SandboxFileToolsOptions

Defined in: [packages/agent-sdk/src/index.ts:65](https://github.com/zocomputer/zov2-code/blob/1201055c5cc9e558bf15b3fd953dc08102ba49af/packages/agent-sdk/src/index.ts#L65)

Options for the sandbox file tools: workspace root (inside the sandbox),
display noun, session resolver, spill dir, attachment/media settings, and
the instruction-stack knobs (tier, omit/extra sections, verify hint,
subagent roster).

## Properties

### bashInteractiveHint?

> `optional` **bashInteractiveHint?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:94](https://github.com/zocomputer/zov2-code/blob/1201055c5cc9e558bf15b3fd953dc08102ba49af/packages/agent-sdk/src/index.ts#L94)

Extra prompt text for interactive-command guidance.

***

### conventionsFileName?

> `optional` **conventionsFileName?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:98](https://github.com/zocomputer/zov2-code/blob/1201055c5cc9e558bf15b3fd953dc08102ba49af/packages/agent-sdk/src/index.ts#L98)

Per-directory conventions filename. Defaults to "AGENTS.md".

***

### extraInstructionSections?

> `optional` **extraInstructionSections?**: readonly [`PlacedPromptSection`](PlacedPromptSection.md)[] \| (() => readonly [`PlacedPromptSection`](PlacedPromptSection.md)[])

Defined in: [packages/agent-sdk/src/index.ts:124](https://github.com/zocomputer/zov2-code/blob/1201055c5cc9e558bf15b3fd953dc08102ba49af/packages/agent-sdk/src/index.ts#L124)

Consumer sections to place into the composed instruction stack.

***

### injectDirConventions?

> `optional` **injectDirConventions?**: `boolean`

Defined in: [packages/agent-sdk/src/index.ts:96](https://github.com/zocomputer/zov2-code/blob/1201055c5cc9e558bf15b3fd953dc08102ba49af/packages/agent-sdk/src/index.ts#L96)

Whether reads inject per-directory conventions. Defaults to `true`.

***

### instructionTier?

> `optional` **instructionTier?**: [`InstructionTier`](../type-aliases/InstructionTier.md)

Defined in: [packages/agent-sdk/src/index.ts:116](https://github.com/zocomputer/zov2-code/blob/1201055c5cc9e558bf15b3fd953dc08102ba49af/packages/agent-sdk/src/index.ts#L116)

Instruction depth.

***

### mediaOracle?

> `optional` **mediaOracle?**: [`MediaOracleOption`](../type-aliases/MediaOracleOption.md)

Defined in: [packages/agent-sdk/src/index.ts:105](https://github.com/zocomputer/zov2-code/blob/1201055c5cc9e558bf15b3fd953dc08102ba49af/packages/agent-sdk/src/index.ts#L105)

Media-oracle configuration. The sandbox `look` reads bytes
through the sandbox session, so the oracle sees the session workspace's
files. Hosted Zo deployments pass `headers: { "x-zo-tool": "look" }` on
the config so the runtime proxy labels the tool's own model traffic.

***

### omitInstructionSections?

> `optional` **omitInstructionSections?**: readonly (`"repo-conventions"` \| `"workflow"` \| `"planning"` \| `"parallel-tools"` \| `"communication"` \| `"hitl"` \| `"media"` \| `"subagents"`)[]

Defined in: [packages/agent-sdk/src/index.ts:122](https://github.com/zocomputer/zov2-code/blob/1201055c5cc9e558bf15b3fd953dc08102ba49af/packages/agent-sdk/src/index.ts#L122)

Further baseline sections `instructions.stack` should drop, by id — on
top of the sandbox topology's own omissions (see the `stack` doc on the
return value).

***

### parentCapabilities?

> `optional` **parentCapabilities?**: [`ModelInputCapabilities`](ModelInputCapabilities.md)

Defined in: [packages/agent-sdk/src/index.ts:110](https://github.com/zocomputer/zov2-code/blob/1201055c5cc9e558bf15b3fd953dc08102ba49af/packages/agent-sdk/src/index.ts#L110)

The parent model's media input capabilities. This informs the stack's
media section (which kinds to view natively versus delegate).

***

### resolveSession?

> `optional` **resolveSession?**: (`ctx`) => `PromiseLike`\<[`SandboxSessionLike`](SandboxSessionLike.md)\>

Defined in: [packages/agent-sdk/src/index.ts:77](https://github.com/zocomputer/zov2-code/blob/1201055c5cc9e558bf15b3fd953dc08102ba49af/packages/agent-sdk/src/index.ts#L77)

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

Defined in: [packages/agent-sdk/src/index.ts:84](https://github.com/zocomputer/zov2-code/blob/1201055c5cc9e558bf15b3fd953dc08102ba49af/packages/agent-sdk/src/index.ts#L84)

Sandbox directory for oversized tool output: grep's overflow match lists
and bash's truncated command output (both spilled through the sandbox, so
the model's follow-up `read` can reach them). Omit to keep grep's
stop-at-cap behavior and bash's label-less truncation markers.

***

### subagentRoster?

> `optional` **subagentRoster?**: readonly [`SubagentRosterEntry`](SubagentRosterEntry.md)[]

Defined in: [packages/agent-sdk/src/index.ts:114](https://github.com/zocomputer/zov2-code/blob/1201055c5cc9e558bf15b3fd953dc08102ba49af/packages/agent-sdk/src/index.ts#L114)

Declared subagents and their routing guidance.

***

### taskStorePath?

> `optional` **taskStorePath?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:92](https://github.com/zocomputer/zov2-code/blob/1201055c5cc9e558bf15b3fd953dc08102ba49af/packages/agent-sdk/src/index.ts#L92)

Path **on the harness's local disk** for the background-task store
(task metadata + completed results, surviving an agent restart).
Defaults to a per-process path under the OS temp dir — fine for
serverless, where the store's lifetime matches the instance anyway;
agents on durable hosts pass a real state path.

***

### verifyCommandHint?

> `optional` **verifyCommandHint?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:112](https://github.com/zocomputer/zov2-code/blob/1201055c5cc9e558bf15b3fd953dc08102ba49af/packages/agent-sdk/src/index.ts#L112)

Optional verification-command guidance for the workflow instruction.

***

### workspaceNoun?

> `optional` **workspaceNoun?**: `string`

Defined in: [packages/agent-sdk/src/index.ts:72](https://github.com/zocomputer/zov2-code/blob/1201055c5cc9e558bf15b3fd953dc08102ba49af/packages/agent-sdk/src/index.ts#L72)

What tool descriptions call the workspace. Defaults to "workspace".

***

### workspaceRoot

> **workspaceRoot**: `string`

Defined in: [packages/agent-sdk/src/index.ts:70](https://github.com/zocomputer/zov2-code/blob/1201055c5cc9e558bf15b3fd953dc08102ba49af/packages/agent-sdk/src/index.ts#L70)

Absolute workspace root **inside the sandbox** (e.g. "/workspace").
File tools refuse paths that escape it.
