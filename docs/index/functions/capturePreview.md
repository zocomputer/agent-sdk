[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / capturePreview

# Function: capturePreview()

> **capturePreview**(`capture`): `string`

Defined in: [packages/agent-sdk/src/run.ts:89](https://github.com/zocomputer/zov2-code/blob/9538a0a8ac4443391049ca02b620175fec05d4cd/packages/agent-sdk/src/run.ts#L89)

Preview text for a live capture: the whole text within `MAX_PREVIEW`,
tail-only (with a leading marker) beyond it. Shared by every runner's
`progress()`.

## Parameters

### capture

[`BoundedCapture`](../interfaces/BoundedCapture.md)

## Returns

`string`
