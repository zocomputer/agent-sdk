[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / capturePreview

# Function: capturePreview()

> **capturePreview**(`capture`): `string`

Defined in: [packages/agent-sdk/src/run.ts:89](https://github.com/zocomputer/zov2-code/blob/a7b5fa23defbcd3c7af6fb49008f7b280d46c09e/packages/agent-sdk/src/run.ts#L89)

Preview text for a live capture: the whole text within `MAX_PREVIEW`,
tail-only (with a leading marker) beyond it. Shared by every runner's
`progress()`.

## Parameters

### capture

[`BoundedCapture`](../interfaces/BoundedCapture.md)

## Returns

`string`
