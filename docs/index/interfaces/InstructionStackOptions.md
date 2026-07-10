[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / InstructionStackOptions

# Interface: InstructionStackOptions

Defined in: [packages/agent-sdk/src/instructions.ts:683](https://github.com/zocomputer/zov2-code/blob/311b5755d0a50f315302987e21c3a97a752a3696/packages/agent-sdk/src/instructions.ts#L683)

Options for the composed instruction stack: workspace + prose parameters
for the baseline sections, the depth tier, and the consumer-edit seams
(omit baseline sections, insert extras at anchors).

## Properties

### extraSections?

> `optional` **extraSections?**: readonly [`PlacedPromptSection`](PlacedPromptSection.md)[] \| (() => readonly [`PlacedPromptSection`](PlacedPromptSection.md)[])

Defined in: [packages/agent-sdk/src/instructions.ts:734](https://github.com/zocomputer/zov2-code/blob/311b5755d0a50f315302987e21c3a97a752a3696/packages/agent-sdk/src/instructions.ts#L734)

Consumer sections to insert at baseline anchors. Pass a function to defer
building until "session.started" — for sections that read the filesystem
per session (e.g. rib's skills catalog) while staying prompt-cache stable
within the session.

***

### media?

> `optional` **media?**: `object`

Defined in: [packages/agent-sdk/src/instructions.ts:716](https://github.com/zocomputer/zov2-code/blob/311b5755d0a50f315302987e21c3a97a752a3696/packages/agent-sdk/src/instructions.ts#L716)

The look oracle's identity, when wired — includes the media section.
Omitted → no media section (and extras anchored to `"media"` append at
the end).

#### capabilities

> **capabilities**: [`ModelInputCapabilities`](ModelInputCapabilities.md)

The oracle model's input capabilities.

#### modelName

> **modelName**: `string`

The oracle model's display name.

#### parentCapabilities?

> `optional` **parentCapabilities?**: [`ModelInputCapabilities`](ModelInputCapabilities.md)

The session model's own capabilities, when resolved.

***

### notifications?

> `optional` **notifications?**: `boolean`

Defined in: [packages/agent-sdk/src/instructions.ts:710](https://github.com/zocomputer/zov2-code/blob/311b5755d0a50f315302987e21c3a97a752a3696/packages/agent-sdk/src/instructions.ts#L710)

Whether the async tools advertise `notify` watchers (default true). Set
false for agents wired with `notifications: false` — the parallel-tools
section then skips the notify guidance, matching the tools' schemas.

***

### omitSections?

> `optional` **omitSections?**: readonly (`"subagents"` \| `"media"` \| `"repo-conventions"` \| `"workflow"` \| `"planning"` \| `"parallel-tools"` \| `"communication"` \| `"hitl"`)[]

Defined in: [packages/agent-sdk/src/instructions.ts:727](https://github.com/zocomputer/zov2-code/blob/311b5755d0a50f315302987e21c3a97a752a3696/packages/agent-sdk/src/instructions.ts#L727)

Baseline sections to drop, by id.

***

### subagentRoster?

> `optional` **subagentRoster?**: readonly [`SubagentRosterEntry`](SubagentRosterEntry.md)[]

Defined in: [packages/agent-sdk/src/instructions.ts:704](https://github.com/zocomputer/zov2-code/blob/311b5755d0a50f315302987e21c3a97a752a3696/packages/agent-sdk/src/instructions.ts#L704)

Declared subagents for the delegation section's routing guidance.

***

### tier?

> `optional` **tier?**: [`InstructionTier`](../type-aliases/InstructionTier.md)

Defined in: [packages/agent-sdk/src/instructions.ts:698](https://github.com/zocomputer/zov2-code/blob/311b5755d0a50f315302987e21c3a97a752a3696/packages/agent-sdk/src/instructions.ts#L698)

Prose depth for every section: `"full"` (default) or `"compact"` (~⅓ the
prose, same rules and tool names — for small/code-tuned models where a
long behavioral prompt crowds the context).

***

### verifyCommandHint?

> `optional` **verifyCommandHint?**: `string`

Defined in: [packages/agent-sdk/src/instructions.ts:702](https://github.com/zocomputer/zov2-code/blob/311b5755d0a50f315302987e21c3a97a752a3696/packages/agent-sdk/src/instructions.ts#L702)

Verify command the workflow section names (e.g. "bun run check").

***

### workspaceNoun?

> `optional` **workspaceNoun?**: `string`

Defined in: [packages/agent-sdk/src/instructions.ts:700](https://github.com/zocomputer/zov2-code/blob/311b5755d0a50f315302987e21c3a97a752a3696/packages/agent-sdk/src/instructions.ts#L700)

What the prose calls the workspace ("repo", "project"…).

***

### workspaceRoot?

> `optional` **workspaceRoot?**: `string`

Defined in: [packages/agent-sdk/src/instructions.ts:692](https://github.com/zocomputer/zov2-code/blob/311b5755d0a50f315302987e21c3a97a752a3696/packages/agent-sdk/src/instructions.ts#L692)

Local workspace root — the repo-conventions section reads its `AGENTS.md`
off this process's own disk. Omit when the workspace isn't on that disk
(a sandbox-backed agent, where the files live in a remote session and
instruction resolvers have no sandbox access): the baseline then carries
no repo-conventions section — like `media` without an oracle — and
convention delivery rides the read tool's dir-conventions riders instead.
