[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / toolAuthoringSection

# Function: toolAuthoringSection()

> **toolAuthoringSection**(`opts?`): [`PromptSection`](../interfaces/PromptSection.md)

Defined in: [packages/agent-sdk/src/instructions.ts:582](https://github.com/zocomputer/zov2-code/blob/1e24004df378afe2dca17754c9e6cedc76f36385/packages/agent-sdk/src/instructions.ts#L582)

The tool-authoring contract section, for agents that WRITE eve tools (Zo's
Builder; any agent that edits another agent's `tools/` directory): the
naming, schema-shape, error, and prompt-cache rules the SDK's own tools
follow (`packages/agent-sdk/src/tools/AGENTS.md`,
`design/foundation/03-prior-aligned-naming.md`). Deliberately NOT part of
the baseline stack — most agents never author tools — wire it via
`extraInstructionSections`.

## Parameters

### opts?

#### tier?

[`InstructionTier`](../type-aliases/InstructionTier.md)

Prose depth; defaults to "full".

## Returns

[`PromptSection`](../interfaces/PromptSection.md)
