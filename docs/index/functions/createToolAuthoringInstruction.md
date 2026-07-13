[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createToolAuthoringInstruction

# Function: createToolAuthoringInstruction()

> **createToolAuthoringInstruction**(`opts?`): `DynamicSentinel`\<\{ `markdown`: `string`; \}\>

Defined in: [packages/agent-sdk/src/instructions.ts:620](https://github.com/zocomputer/zov2-code/blob/71f3c28acf6f43bb252eb9f351caca137d9922f9/packages/agent-sdk/src/instructions.ts#L620)

The tool-authoring contract as a standalone à la carte instruction, for
agents that author eve tools. Static and session-stable (prompt-cache
safe). Stack consumers pass [toolAuthoringSection](toolAuthoringSection.md) through
`extraInstructionSections` instead.

## Parameters

### opts?

#### tier?

[`InstructionTier`](../type-aliases/InstructionTier.md)

## Returns

`DynamicSentinel`\<\{ `markdown`: `string`; \}\>
