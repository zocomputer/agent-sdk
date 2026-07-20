[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / buildInstructionStackSections

# Function: buildInstructionStackSections()

> **buildInstructionStackSections**(`opts`): [`PromptSection`](../interfaces/PromptSection.md)[]

Defined in: [packages/agent-sdk/src/instructions.ts:785](https://github.com/zocomputer/zov2-code/blob/9a2687559528851e1e25b6b64341058d2d74e9dc/packages/agent-sdk/src/instructions.ts#L785)

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
