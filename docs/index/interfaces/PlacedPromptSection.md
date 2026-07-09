[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / PlacedPromptSection

# Interface: PlacedPromptSection

Defined in: [packages/agent-sdk/src/prompt-sections.ts:73](https://github.com/zocomputer/zov2-code/blob/2004eea2e2488195525555d1ec03711235aadc63/packages/agent-sdk/src/prompt-sections.ts#L73)

A consumer-owned section plus where to place it among the baseline
sections. No `placement` appends it at the end. Anchors refer to baseline
section ids only — extras can't anchor to other extras.

## Properties

### placement?

> `readonly` `optional` **placement?**: [`SectionPlacement`](../type-aliases/SectionPlacement.md)

Defined in: [packages/agent-sdk/src/prompt-sections.ts:77](https://github.com/zocomputer/zov2-code/blob/2004eea2e2488195525555d1ec03711235aadc63/packages/agent-sdk/src/prompt-sections.ts#L77)

Placement relative to a baseline section id; omitted → appended last.

***

### section

> `readonly` **section**: [`PromptSection`](PromptSection.md)

Defined in: [packages/agent-sdk/src/prompt-sections.ts:75](https://github.com/zocomputer/zov2-code/blob/2004eea2e2488195525555d1ec03711235aadc63/packages/agent-sdk/src/prompt-sections.ts#L75)

The section to insert.
