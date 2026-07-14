[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / hitlSection

# Function: hitlSection()

> **hitlSection**(`opts?`): [`PromptSection`](../interfaces/PromptSection.md)

Defined in: [packages/agent-sdk/src/instructions.ts:350](https://github.com/zocomputer/zov2-code/blob/a7b5fa23defbcd3c7af6fb49008f7b280d46c09e/packages/agent-sdk/src/instructions.ts#L350)

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
