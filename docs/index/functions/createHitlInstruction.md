[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createHitlInstruction

# Function: createHitlInstruction()

> **createHitlInstruction**(`opts?`): `DynamicSentinel`\<\{ `markdown`: `string`; \}\>

Defined in: [packages/agent-sdk/src/instructions.ts:390](https://github.com/zocomputer/zov2-code/blob/ea094c0d7d3efd4351c48b5c1bd38d95a1836e8d/packages/agent-sdk/src/instructions.ts#L390)

The ask_question playbook for eve's built-in HITL tool. The framework ships
the tool with a one-line description and no guidance on options, styles, or
when to ask; models under-use the structured surface without this. Static
and session-stable (prompt-cache safe).

## Parameters

### opts?

#### tier?

[`InstructionTier`](../type-aliases/InstructionTier.md)

## Returns

`DynamicSentinel`\<\{ `markdown`: `string`; \}\>
