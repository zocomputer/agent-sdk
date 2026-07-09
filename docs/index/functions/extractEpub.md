[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / extractEpub

# Function: extractEpub()

> **extractEpub**(`bytes`, `options?`): [`EpubExtraction`](../type-aliases/EpubExtraction.md)

Defined in: [packages/agent-sdk/src/extract/epub.ts:129](https://github.com/zocomputer/zov2-code/blob/edfd579427fbfafd3e21ca75b7f30a50695b254b/packages/agent-sdk/src/extract/epub.ts#L129)

Extract EPUB bytes into text: spine sections in reading order under
`=== section N of M (href) ===` markers. Extraction stops at
`sectionCap` sections; `sections` reports the true total.

## Parameters

### bytes

`Uint8Array`

### options?

#### sectionCap?

`number`

## Returns

[`EpubExtraction`](../type-aliases/EpubExtraction.md)
