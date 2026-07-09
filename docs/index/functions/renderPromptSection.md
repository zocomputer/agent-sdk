[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / renderPromptSection

# Function: renderPromptSection()

> **renderPromptSection**(`section`): `string`

Defined in: [packages/agent-sdk/src/prompt-sections.ts:42](https://github.com/zocomputer/zov2-code/blob/8718aaa2765d9af21ff0cbb162dec35286dbcb11/packages/agent-sdk/src/prompt-sections.ts#L42)

Render one section as `## {heading}` followed by its body, or `""` when the
body is blank (an absent section contributes nothing to the prompt).

## Parameters

### section

[`PromptSection`](../interfaces/PromptSection.md)

## Returns

`string`
