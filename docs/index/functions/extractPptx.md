[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / extractPptx

# Function: extractPptx()

> **extractPptx**(`bytes`, `options?`): [`PptxExtraction`](../type-aliases/PptxExtraction.md)

Defined in: [packages/agent-sdk/src/extract/pptx.ts:169](https://github.com/zocomputer/zov2-code/blob/2480a6ef0f68d759f57bf84a8fcb14c879dd765d/packages/agent-sdk/src/extract/pptx.ts#L169)

Extract PPTX bytes into text: slides in deck order under
`=== slide N of M ===` markers, speaker notes appended per slide.
Extraction stops at `slideCap` slides; `slides` reports the true total.

## Parameters

### bytes

`Uint8Array`

### options?

#### slideCap?

`number`

## Returns

[`PptxExtraction`](../type-aliases/PptxExtraction.md)
