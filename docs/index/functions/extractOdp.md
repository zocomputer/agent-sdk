[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / extractOdp

# Function: extractOdp()

> **extractOdp**(`bytes`): [`OdpExtraction`](../type-aliases/OdpExtraction.md)

Defined in: [packages/agent-sdk/src/extract/odf.ts:121](https://github.com/zocomputer/zov2-code/blob/561b0153afcd985ff89c43386656aa6cb1d2502e/packages/agent-sdk/src/extract/odf.ts#L121)

Extract ODP (OpenDocument presentation) bytes into text: one
`=== slide N of M ===` block per `draw:page`.

## Parameters

### bytes

`Uint8Array`

## Returns

[`OdpExtraction`](../type-aliases/OdpExtraction.md)
