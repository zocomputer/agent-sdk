[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / buildInstructionStackSections

# Function: buildInstructionStackSections()

> **buildInstructionStackSections**(`opts`): [`PromptSection`](../interfaces/PromptSection.md)[]

Defined in: [packages/agent-sdk/src/instructions.ts:726](https://github.com/zocomputer/zov2-code/blob/e7fb39c35601ce5ee40494fbfe469df1f7a9ecc4/packages/agent-sdk/src/instructions.ts#L726)

Build the stack's sections: the baseline in canonical order
(repo-conventions only with a local `workspaceRoot`, media only when an
oracle is wired), minus `omitSections`, plus `extraSections` at their
anchors. Pure given the filesystem (reads the root AGENTS.md) — the
tested core under [createInstructionStackInstruction](createInstructionStackInstruction.md).

## Parameters

### opts

[`InstructionStackOptions`](../interfaces/InstructionStackOptions.md)

## Returns

[`PromptSection`](../interfaces/PromptSection.md)[]
