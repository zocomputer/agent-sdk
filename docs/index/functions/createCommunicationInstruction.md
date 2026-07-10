[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createCommunicationInstruction

# Function: createCommunicationInstruction()

> **createCommunicationInstruction**(`opts?`): `DynamicSentinel`

Defined in: [packages/agent-sdk/src/instructions.ts:349](https://github.com/zocomputer/zov2-code/blob/9c31432d7362033dfbece45d1305011eb46c55ac/packages/agent-sdk/src/instructions.ts#L349)

The reporting contract: lead with the outcome, keep prose readable,
assess-don't-fix when the user is diagnosing, act without permission-seeking
inside the task's scope. Static and session-stable (prompt-cache safe).

## Parameters

### opts?

#### tier?

[`InstructionTier`](../type-aliases/InstructionTier.md)

## Returns

`DynamicSentinel`
