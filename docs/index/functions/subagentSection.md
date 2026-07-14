[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / subagentSection

# Function: subagentSection()

> **subagentSection**(`opts?`): [`PromptSection`](../interfaces/PromptSection.md)

Defined in: [packages/agent-sdk/src/instructions.ts:495](https://github.com/zocomputer/zov2-code/blob/9538a0a8ac4443391049ca02b620175fec05d4cd/packages/agent-sdk/src/instructions.ts#L495)

The delegation section for eve's built-in `agent` tool (a fresh clone with
a blank conversation) and, when `roster` names declared subagents, the
routing guidance between them.

## Parameters

### opts?

#### roster?

readonly [`SubagentRosterEntry`](../interfaces/SubagentRosterEntry.md)[]

Declared specialists to route to; omitted → clone-only guidance.

#### tier?

[`InstructionTier`](../type-aliases/InstructionTier.md)

Prose depth; defaults to "full".

#### workspaceNoun?

`string`

What the prose calls the workspace ("repo", "project"…).

## Returns

[`PromptSection`](../interfaces/PromptSection.md)
