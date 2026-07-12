[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / capabilitiesFromCatalogEntry

# Function: capabilitiesFromCatalogEntry()

> **capabilitiesFromCatalogEntry**(`entry`): [`ModelInputCapabilities`](../interfaces/ModelInputCapabilities.md)

Defined in: [packages/agent-sdk/src/model-capabilities.ts:59](https://github.com/zocomputer/zov2-code/blob/1fcc8b4b31cf28b6badb9d28c6512cd9261c730c/packages/agent-sdk/src/model-capabilities.ts#L59)

Capabilities attested by one catalog entry's tags: `vision` → image,
`file-input` → PDF. Video/audio are always false here — the catalog can't
express them; that's the overlay's job (see [capabilitiesForModel](capabilitiesForModel.md)).

## Parameters

### entry

`Pick`\<[`GatewayModelInfo`](../interfaces/GatewayModelInfo.md), `"tags"`\>

## Returns

[`ModelInputCapabilities`](../interfaces/ModelInputCapabilities.md)
