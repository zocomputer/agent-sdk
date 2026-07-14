[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / lookSection

# Function: lookSection()

> **lookSection**(`opts`): [`PromptSection`](../interfaces/PromptSection.md)

Defined in: [packages/agent-sdk/src/instructions.ts:410](https://github.com/zocomputer/zov2-code/blob/63d0e014c421616ce0383b99e59109da774eac14/packages/agent-sdk/src/instructions.ts#L410)

The media-delegation section for agents with a `look` oracle wired: view
natively what the session model supports, route documents through `read`,
delegate the rest to the oracle with a self-contained question.

## Parameters

### opts

#### capabilities

[`ModelInputCapabilities`](../interfaces/ModelInputCapabilities.md)

The oracle model's input capabilities.

#### modelName

`string`

The oracle model's display name (e.g. "Gemini 3 Flash").

#### parentCapabilities?

[`ModelInputCapabilities`](../interfaces/ModelInputCapabilities.md)

The session model's own input capabilities, when the consumer resolved
them — adds the "view what you can natively" half of the routing rule.

#### tier?

[`InstructionTier`](../type-aliases/InstructionTier.md)

Prose depth; defaults to "full".

## Returns

[`PromptSection`](../interfaces/PromptSection.md)
