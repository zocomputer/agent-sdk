[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / extractOdp

# Function: extractOdp()

> **extractOdp**(`bytes`): [`OdpExtraction`](../type-aliases/OdpExtraction.md)

Defined in: [packages/agent-sdk/src/extract/odf.ts:121](https://github.com/zocomputer/zov2-code/blob/1e24004df378afe2dca17754c9e6cedc76f36385/packages/agent-sdk/src/extract/odf.ts#L121)

Extract ODP (OpenDocument presentation) bytes into text: one
`=== slide N of M ===` block per `draw:page`.

## Parameters

### bytes

`Uint8Array`

## Returns

[`OdpExtraction`](../type-aliases/OdpExtraction.md)
