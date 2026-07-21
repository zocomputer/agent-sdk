[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / extractPptx

# Function: extractPptx()

> **extractPptx**(`bytes`, `options?`): [`PptxExtraction`](../type-aliases/PptxExtraction.md)

Defined in: [packages/agent-sdk/src/extract/pptx.ts:169](https://github.com/zocomputer/zov2-code/blob/fc65ac4f3ad029ed138ee11331693cba0bd295b4/packages/agent-sdk/src/extract/pptx.ts#L169)

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
