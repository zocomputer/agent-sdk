[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / composePromptSections

# Function: composePromptSections()

> **composePromptSections**(`baseline`, `options?`): [`PromptSection`](../interfaces/PromptSection.md)[]

Defined in: [packages/agent-sdk/src/prompt-sections.ts:87](https://github.com/zocomputer/zov2-code/blob/178825142421d42c04f57b0afbc80612a16fe4c6/packages/agent-sdk/src/prompt-sections.ts#L87)

Compose a prompt from a baseline section order plus consumer edits: drop
baseline sections by id (`omit`), and insert extras relative to baseline
anchors (`extras`). Multiple extras sharing an anchor keep their given
order; an extra whose anchor is unknown or omitted appends at the end.
Pure — the tested core under `buildInstructionStackSections`.

## Parameters

### baseline

readonly [`PromptSection`](../interfaces/PromptSection.md)[]

### options?

#### extras?

readonly [`PlacedPromptSection`](../interfaces/PlacedPromptSection.md)[]

Consumer sections to insert.

#### omit?

readonly `string`[]

Baseline section ids to drop.

## Returns

[`PromptSection`](../interfaces/PromptSection.md)[]
