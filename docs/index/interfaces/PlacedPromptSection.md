[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / PlacedPromptSection

# Interface: PlacedPromptSection

Defined in: [packages/agent-sdk/src/prompt-sections.ts:73](https://github.com/zocomputer/zov2-code/blob/178825142421d42c04f57b0afbc80612a16fe4c6/packages/agent-sdk/src/prompt-sections.ts#L73)

A consumer-owned section plus where to place it among the baseline
sections. No `placement` appends it at the end. Anchors refer to baseline
section ids only — extras can't anchor to other extras.

## Properties

### placement?

> `readonly` `optional` **placement?**: [`SectionPlacement`](../type-aliases/SectionPlacement.md)

Defined in: [packages/agent-sdk/src/prompt-sections.ts:77](https://github.com/zocomputer/zov2-code/blob/178825142421d42c04f57b0afbc80612a16fe4c6/packages/agent-sdk/src/prompt-sections.ts#L77)

Placement relative to a baseline section id; omitted → appended last.

***

### section

> `readonly` **section**: [`PromptSection`](PromptSection.md)

Defined in: [packages/agent-sdk/src/prompt-sections.ts:75](https://github.com/zocomputer/zov2-code/blob/178825142421d42c04f57b0afbc80612a16fe4c6/packages/agent-sdk/src/prompt-sections.ts#L75)

The section to insert.
