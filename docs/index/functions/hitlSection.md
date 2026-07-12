[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / hitlSection

# Function: hitlSection()

> **hitlSection**(`opts?`): [`PromptSection`](../interfaces/PromptSection.md)

Defined in: [packages/agent-sdk/src/instructions.ts:371](https://github.com/zocomputer/zov2-code/blob/13e58351dfe3adc12c256d37f6058b3b4e0032bd/packages/agent-sdk/src/instructions.ts#L371)

The ask_question playbook section: ask only when blocked on the user's
choice, structured options with a primary recommendation, freeform open,
batch independent questions.

## Parameters

### opts?

#### tier?

[`InstructionTier`](../type-aliases/InstructionTier.md)

Prose depth; defaults to "full".

## Returns

[`PromptSection`](../interfaces/PromptSection.md)
