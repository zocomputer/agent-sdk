[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / extractPptx

# Function: extractPptx()

> **extractPptx**(`bytes`, `options?`): [`PptxExtraction`](../type-aliases/PptxExtraction.md)

Defined in: [packages/agent-sdk/src/extract/pptx.ts:169](https://github.com/zocomputer/zov2-code/blob/1e24004df378afe2dca17754c9e6cedc76f36385/packages/agent-sdk/src/extract/pptx.ts#L169)

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
