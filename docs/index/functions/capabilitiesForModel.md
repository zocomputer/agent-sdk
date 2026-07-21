[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / capabilitiesForModel

# Function: capabilitiesForModel()

> **capabilitiesForModel**(`modelId`, `catalog`): [`ModelInputCapabilities`](../interfaces/ModelInputCapabilities.md)

Defined in: [packages/agent-sdk/src/model-capabilities.ts:84](https://github.com/zocomputer/zov2-code/blob/3530b39a94e929be74c3d9202bace84f47b21b44/packages/agent-sdk/src/model-capabilities.ts#L84)

Resolve a model's input capabilities from the fetched gateway catalog:
catalog tags as the base (text-only when the model isn't listed), then the
curated family overlay unioned on top. Pure — feed it the result of
`fetchGatewayModelCatalog` from a one-shot refresh script and check the
output in; never call this at agent build time.

## Parameters

### modelId

`string`

### catalog

readonly `Pick`\<[`GatewayModelInfo`](../interfaces/GatewayModelInfo.md), `"id"` \| `"tags"`\>[]

## Returns

[`ModelInputCapabilities`](../interfaces/ModelInputCapabilities.md)
