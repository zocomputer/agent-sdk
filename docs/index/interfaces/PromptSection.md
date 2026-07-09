[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / PromptSection

# Interface: PromptSection

Defined in: [packages/agent-sdk/src/prompt-sections.ts:29](https://github.com/zocomputer/zov2-code/blob/2c62d8b884523ef65360fa00bdaffe3cdda99189/packages/agent-sdk/src/prompt-sections.ts#L29)

One system-prompt section: a stable `id` (placement anchor and omit key),
the markdown `heading` (rendered as `## {heading}`), and the tier-rendered
`body`. A section with an empty body renders to nothing.

## Properties

### body

> `readonly` **body**: `string`

Defined in: [packages/agent-sdk/src/prompt-sections.ts:35](https://github.com/zocomputer/zov2-code/blob/2c62d8b884523ef65360fa00bdaffe3cdda99189/packages/agent-sdk/src/prompt-sections.ts#L35)

Markdown body for the chosen tier; empty means "render nothing".

***

### heading

> `readonly` **heading**: `string`

Defined in: [packages/agent-sdk/src/prompt-sections.ts:33](https://github.com/zocomputer/zov2-code/blob/2c62d8b884523ef65360fa00bdaffe3cdda99189/packages/agent-sdk/src/prompt-sections.ts#L33)

Section heading, without the leading `## `.

***

### id

> `readonly` **id**: `string`

Defined in: [packages/agent-sdk/src/prompt-sections.ts:31](https://github.com/zocomputer/zov2-code/blob/2c62d8b884523ef65360fa00bdaffe3cdda99189/packages/agent-sdk/src/prompt-sections.ts#L31)

Stable identifier — the anchor for placement and the key for omission.
