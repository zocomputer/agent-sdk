[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / renderPromptSection

# Function: renderPromptSection()

> **renderPromptSection**(`section`): `string`

Defined in: [packages/agent-sdk/src/prompt-sections.ts:42](https://github.com/zocomputer/zov2-code/blob/311b5755d0a50f315302987e21c3a97a752a3696/packages/agent-sdk/src/prompt-sections.ts#L42)

Render one section as `## {heading}` followed by its body, or `""` when the
body is blank (an absent section contributes nothing to the prompt).

## Parameters

### section

[`PromptSection`](../interfaces/PromptSection.md)

## Returns

`string`
