[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / toolAuthoringSection

# Function: toolAuthoringSection()

> **toolAuthoringSection**(`opts?`): [`PromptSection`](../interfaces/PromptSection.md)

Defined in: [packages/agent-sdk/src/instructions.ts:603](https://github.com/zocomputer/zov2-code/blob/384c0715e5dbd68ec5614af4167eaef9b0b6e0cd/packages/agent-sdk/src/instructions.ts#L603)

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
