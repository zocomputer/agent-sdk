[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / sandboxArtifactsSection

# Function: sandboxArtifactsSection()

> **sandboxArtifactsSection**(`opts?`): [`PromptSection`](../interfaces/PromptSection.md)

Defined in: [packages/agent-sdk/src/instructions.ts:487](https://github.com/zocomputer/zov2-code/blob/9a2687559528851e1e25b6b64341058d2d74e9dc/packages/agent-sdk/src/instructions.ts#L487)

Routing guidance for consumers whose sandbox image carries Zo's standard
document, browser, media, and data CLIs. Kept opt-in because the SDK can
also run over arbitrary sandboxes that do not provide this image contract.

## Parameters

### opts?

#### tier?

[`InstructionTier`](../type-aliases/InstructionTier.md)

Prose depth; defaults to "full".

## Returns

[`PromptSection`](../interfaces/PromptSection.md)
