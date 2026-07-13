[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createCommunicationInstruction

# Function: createCommunicationInstruction()

> **createCommunicationInstruction**(`opts?`): `DynamicSentinel`\<\{ `markdown`: `string`; \}\>

Defined in: [packages/agent-sdk/src/instructions.ts:328](https://github.com/zocomputer/zov2-code/blob/07721c227b11c8cc8115ab6c09048e903415a342/packages/agent-sdk/src/instructions.ts#L328)

The reporting contract: lead with the outcome, keep prose readable,
assess-don't-fix when the user is diagnosing, act without permission-seeking
inside the task's scope. Static and session-stable (prompt-cache safe).

## Parameters

### opts?

#### tier?

[`InstructionTier`](../type-aliases/InstructionTier.md)

## Returns

`DynamicSentinel`\<\{ `markdown`: `string`; \}\>
