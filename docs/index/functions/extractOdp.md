[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / extractOdp

# Function: extractOdp()

> **extractOdp**(`bytes`): [`OdpExtraction`](../type-aliases/OdpExtraction.md)

Defined in: [packages/agent-sdk/src/extract/odf.ts:121](https://github.com/zocomputer/zov2-code/blob/a2d5ceb2d9204a0eb63ca9530ef74679c3b52143/packages/agent-sdk/src/extract/odf.ts#L121)

Extract ODP (OpenDocument presentation) bytes into text: one
`=== slide N of M ===` block per `draw:page`.

## Parameters

### bytes

`Uint8Array`

## Returns

[`OdpExtraction`](../type-aliases/OdpExtraction.md)
