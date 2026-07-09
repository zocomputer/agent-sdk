[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / communicationSection

# Function: communicationSection()

> **communicationSection**(`opts?`): [`PromptSection`](../interfaces/PromptSection.md)

Defined in: [packages/agent-sdk/src/instructions.ts:295](https://github.com/zocomputer/zov2-code/blob/58f42fa9905e1eaf108a953f694006c436ab7598/packages/agent-sdk/src/instructions.ts#L295)

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
