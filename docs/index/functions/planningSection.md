[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / planningSection

# Function: planningSection()

> **planningSection**(`opts?`): [`PromptSection`](../interfaces/PromptSection.md)

Defined in: [packages/agent-sdk/src/instructions.ts:172](https://github.com/zocomputer/zov2-code/blob/ea094c0d7d3efd4351c48b5c1bd38d95a1836e8d/packages/agent-sdk/src/instructions.ts#L172)

The todo-tool playbook: when a plan is worth writing, what a good step
looks like, and the status discipline (one `in_progress`, immediate
completion, whole-list writes, cancel-don't-abandon). eve ships the `todo`
tool with no guidance — same gap as ask_question — and models under-plan or
let lists go stale without it. Adapted from codex's Planning section.

## Parameters

### opts?

#### tier?

[`InstructionTier`](../type-aliases/InstructionTier.md)

Prose depth; defaults to "full".

## Returns

[`PromptSection`](../interfaces/PromptSection.md)
