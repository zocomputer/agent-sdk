[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createToolAuthoringInstruction

# Function: createToolAuthoringInstruction()

> **createToolAuthoringInstruction**(`opts?`): `DynamicSentinel`\<\{ `markdown`: `string`; \}\>

Defined in: [packages/agent-sdk/src/instructions.ts:626](https://github.com/zocomputer/zov2-code/blob/63d0e014c421616ce0383b99e59109da774eac14/packages/agent-sdk/src/instructions.ts#L626)

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
