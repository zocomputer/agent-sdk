[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / renderPromptSection

# Function: renderPromptSection()

> **renderPromptSection**(`section`): `string`

Defined in: [packages/agent-sdk/src/prompt-sections.ts:42](https://github.com/zocomputer/zov2-code/blob/2480a6ef0f68d759f57bf84a8fcb14c879dd765d/packages/agent-sdk/src/prompt-sections.ts#L42)

Render one section as `## {heading}` followed by its body, or `""` when the
body is blank (an absent section contributes nothing to the prompt).

## Parameters

### section

[`PromptSection`](../interfaces/PromptSection.md)

## Returns

`string`
