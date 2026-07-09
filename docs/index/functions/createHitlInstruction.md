[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createHitlInstruction

# Function: createHitlInstruction()

> **createHitlInstruction**(`opts?`): `DynamicSentinel`

Defined in: [packages/agent-sdk/src/instructions.ts:382](https://github.com/zocomputer/zov2-code/blob/f16d57089a60328b9900d1483bcd363cd844b8b3/packages/agent-sdk/src/instructions.ts#L382)

The ask_question playbook for eve's built-in HITL tool. The framework ships
the tool with a one-line description and no guidance on options, styles, or
when to ask; models under-use the structured surface without this. Static
and session-stable (prompt-cache safe).

## Parameters

### opts?

#### tier?

[`InstructionTier`](../type-aliases/InstructionTier.md)

## Returns

`DynamicSentinel`
