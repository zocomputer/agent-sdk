[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / workflowSection

# Function: workflowSection()

> **workflowSection**(`opts?`): [`PromptSection`](../interfaces/PromptSection.md)

Defined in: [packages/agent-sdk/src/instructions.ts:103](https://github.com/zocomputer/zov2-code/blob/ff98edef5b507bf96c80f8f4c36882d827c8a81e/packages/agent-sdk/src/instructions.ts#L103)

The how-to-work section: explore→read→edit, follow conventions, reproduce a
bug before fixing it, verify, track with `todo`, and the end-of-turn
completeness check. The compact tier keeps every rule and tool name as a
terse bullet.

## Parameters

### opts?

#### tier?

[`InstructionTier`](../type-aliases/InstructionTier.md)

Prose depth; defaults to "full".

#### verifyCommandHint?

`string`

Verify command to name in the verification rule (e.g. "bun run check").

#### workspaceNoun?

`string`

What the prose calls the workspace ("repo", "project"…).

## Returns

[`PromptSection`](../interfaces/PromptSection.md)
