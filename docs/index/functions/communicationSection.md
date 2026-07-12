[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / communicationSection

# Function: communicationSection()

> **communicationSection**(`opts?`): [`PromptSection`](../interfaces/PromptSection.md)

Defined in: [packages/agent-sdk/src/instructions.ts:318](https://github.com/zocomputer/zov2-code/blob/13e58351dfe3adc12c256d37f6058b3b4e0032bd/packages/agent-sdk/src/instructions.ts#L318)

The reporting-contract section: lead with the outcome, readable over brief,
report-don't-fix when the user is diagnosing, act without permission-seeking
inside scope, faithful outcome reporting.

## Parameters

### opts?

#### tier?

[`InstructionTier`](../type-aliases/InstructionTier.md)

Prose depth; defaults to "full".

## Returns

[`PromptSection`](../interfaces/PromptSection.md)
