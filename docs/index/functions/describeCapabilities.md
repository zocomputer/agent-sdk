[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / describeCapabilities

# Function: describeCapabilities()

> **describeCapabilities**(`caps`): `string`

Defined in: [packages/agent-sdk/src/model-capabilities.ts:120](https://github.com/zocomputer/zov2-code/blob/431612973a5c06efcad7920699932d7fe7145ddd/packages/agent-sdk/src/model-capabilities.ts#L120)

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
