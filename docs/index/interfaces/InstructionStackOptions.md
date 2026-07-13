[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / InstructionStackOptions

# Interface: InstructionStackOptions

Defined in: [packages/agent-sdk/src/instructions.ts:662](https://github.com/zocomputer/zov2-code/blob/07721c227b11c8cc8115ab6c09048e903415a342/packages/agent-sdk/src/instructions.ts#L662)

Options for the composed instruction stack: workspace + prose parameters
for the baseline sections, the depth tier, and the consumer-edit seams
(omit baseline sections, insert extras at anchors).

## Properties

### extraSections?

> `optional` **extraSections?**: readonly [`PlacedPromptSection`](PlacedPromptSection.md)[] \| (() => readonly [`PlacedPromptSection`](PlacedPromptSection.md)[])

Defined in: [packages/agent-sdk/src/instructions.ts:707](https://github.com/zocomputer/zov2-code/blob/07721c227b11c8cc8115ab6c09048e903415a342/packages/agent-sdk/src/instructions.ts#L707)

Consumer sections to insert at baseline anchors. Pass a function to defer
building until "session.started" — for sections that read the filesystem
per session (e.g. rib's skills catalog) while staying prompt-cache stable
within the session.

***

### media?

> `optional` **media?**: `object`

Defined in: [packages/agent-sdk/src/instructions.ts:689](https://github.com/zocomputer/zov2-code/blob/07721c227b11c8cc8115ab6c09048e903415a342/packages/agent-sdk/src/instructions.ts#L689)

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

### omitSections?

> `optional` **omitSections?**: readonly (`"repo-conventions"` \| `"workflow"` \| `"planning"` \| `"parallel-tools"` \| `"communication"` \| `"hitl"` \| `"media"` \| `"subagents"`)[]

Defined in: [packages/agent-sdk/src/instructions.ts:700](https://github.com/zocomputer/zov2-code/blob/07721c227b11c8cc8115ab6c09048e903415a342/packages/agent-sdk/src/instructions.ts#L700)

Baseline sections to drop, by id.

***

### subagentRoster?

> `optional` **subagentRoster?**: readonly [`SubagentRosterEntry`](SubagentRosterEntry.md)[]

Defined in: [packages/agent-sdk/src/instructions.ts:683](https://github.com/zocomputer/zov2-code/blob/07721c227b11c8cc8115ab6c09048e903415a342/packages/agent-sdk/src/instructions.ts#L683)

Declared subagents for the delegation section's routing guidance.

***

### tier?

> `optional` **tier?**: [`InstructionTier`](../type-aliases/InstructionTier.md)

Defined in: [packages/agent-sdk/src/instructions.ts:677](https://github.com/zocomputer/zov2-code/blob/07721c227b11c8cc8115ab6c09048e903415a342/packages/agent-sdk/src/instructions.ts#L677)

Prose depth for every section: `"full"` (default) or `"compact"` (~⅓ the
prose, same rules and tool names — for small/code-tuned models where a
long behavioral prompt crowds the context).

***

### verifyCommandHint?

> `optional` **verifyCommandHint?**: `string`

Defined in: [packages/agent-sdk/src/instructions.ts:681](https://github.com/zocomputer/zov2-code/blob/07721c227b11c8cc8115ab6c09048e903415a342/packages/agent-sdk/src/instructions.ts#L681)

Verify command the workflow section names (e.g. "bun run check").

***

### workspaceNoun?

> `optional` **workspaceNoun?**: `string`

Defined in: [packages/agent-sdk/src/instructions.ts:679](https://github.com/zocomputer/zov2-code/blob/07721c227b11c8cc8115ab6c09048e903415a342/packages/agent-sdk/src/instructions.ts#L679)

What the prose calls the workspace ("repo", "project"…).

***

### workspaceRoot?

> `optional` **workspaceRoot?**: `string`

Defined in: [packages/agent-sdk/src/instructions.ts:671](https://github.com/zocomputer/zov2-code/blob/07721c227b11c8cc8115ab6c09048e903415a342/packages/agent-sdk/src/instructions.ts#L671)

Local workspace root — the repo-conventions section reads its `AGENTS.md`
off this process's own disk. Omit when the workspace isn't on that disk
(a sandbox-backed agent, where the files live in a remote session and
instruction resolvers have no sandbox access): the baseline then carries
no repo-conventions section — like `media` without an oracle — and
convention delivery rides the read tool's dir-conventions riders instead.
