[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createToolAuthoringInstruction

# Function: createToolAuthoringInstruction()

> **createToolAuthoringInstruction**(`opts?`): `DynamicSentinel`\<\{ `markdown`: `string`; \}\>

Defined in: [packages/agent-sdk/src/instructions.ts:685](https://github.com/zocomputer/zov2-code/blob/bc82d445ad6dedff4ca3f700330838d6a3441bf7/packages/agent-sdk/src/instructions.ts#L685)

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
