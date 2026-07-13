[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / extractEpub

# Function: extractEpub()

> **extractEpub**(`bytes`, `options?`): [`EpubExtraction`](../type-aliases/EpubExtraction.md)

Defined in: [packages/agent-sdk/src/extract/epub.ts:129](https://github.com/zocomputer/zov2-code/blob/76a0c7e372069bfa29a1d30375fdc2f67f746411/packages/agent-sdk/src/extract/epub.ts#L129)

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
