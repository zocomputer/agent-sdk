[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / describeCapabilities

# Function: describeCapabilities()

> **describeCapabilities**(`caps`): `string`

Defined in: [packages/agent-sdk/src/model-capabilities.ts:120](https://github.com/zocomputer/zov2-code/blob/a7b5fa23defbcd3c7af6fb49008f7b280d46c09e/packages/agent-sdk/src/model-capabilities.ts#L120)

The one human/model-facing phrase for a capability set — "can view images
and PDFs, but not video or audio" — so every surface (tool descriptions,
unavailable-media hints, tier routing lines) says it the same way. Static
per capability set; prompt-cache safe wherever it's interpolated once at
factory time.

## Parameters

### caps

[`ModelInputCapabilities`](../interfaces/ModelInputCapabilities.md)

## Returns

`string`
