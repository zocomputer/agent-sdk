[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / capabilitiesFromCatalogEntry

# Function: capabilitiesFromCatalogEntry()

> **capabilitiesFromCatalogEntry**(`entry`): [`ModelInputCapabilities`](../interfaces/ModelInputCapabilities.md)

Defined in: [packages/agent-sdk/src/model-capabilities.ts:59](https://github.com/zocomputer/zov2-code/blob/a8636edc2f6184e686ebe291b26c3e5e9b3ae7ef/packages/agent-sdk/src/model-capabilities.ts#L59)

Capabilities attested by one catalog entry's tags: `vision` → image,
`file-input` → PDF. Video/audio are always false here — the catalog can't
express them; that's the overlay's job (see [capabilitiesForModel](capabilitiesForModel.md)).

## Parameters

### entry

`Pick`\<[`GatewayModelInfo`](../interfaces/GatewayModelInfo.md), `"tags"`\>

## Returns

[`ModelInputCapabilities`](../interfaces/ModelInputCapabilities.md)
