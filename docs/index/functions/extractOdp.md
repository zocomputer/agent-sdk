[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / extractOdp

# Function: extractOdp()

> **extractOdp**(`bytes`): [`OdpExtraction`](../type-aliases/OdpExtraction.md)

Defined in: [packages/agent-sdk/src/extract/odf.ts:121](https://github.com/zocomputer/zov2-code/blob/edfd579427fbfafd3e21ca75b7f30a50695b254b/packages/agent-sdk/src/extract/odf.ts#L121)

Extract ODP (OpenDocument presentation) bytes into text: one
`=== slide N of M ===` block per `draw:page`.

## Parameters

### bytes

`Uint8Array`

## Returns

[`OdpExtraction`](../type-aliases/OdpExtraction.md)
