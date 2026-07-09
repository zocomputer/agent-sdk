[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / fetchGatewayModelCatalog

# Function: fetchGatewayModelCatalog()

> **fetchGatewayModelCatalog**(`options?`): `Promise`\<[`GatewayModelInfo`](../interfaces/GatewayModelInfo.md)[]\>

Defined in: [packages/agent-sdk/src/task.ts:433](https://github.com/zocomputer/zov2-code/blob/a259f6f3d345009ac90c86d9f10d9171b99736b9/packages/agent-sdk/src/task.ts#L433)

Fetch the AI Gateway model catalog — names + descriptions for every model
the gateway serves. For ONE-SHOT refresh scripts that regenerate a
consumer's checked-in model blurbs; never call it at agent build time (tool
descriptions are part of the cached prompt prefix, so they must be static
and offline-safe).

## Parameters

### options?

#### fetchImpl?

(`url`) => `Promise`\<`Response`\>

Injectable fetch seam (the one call this makes); defaults to global fetch.

#### url?

`string`

## Returns

`Promise`\<[`GatewayModelInfo`](../interfaces/GatewayModelInfo.md)[]\>
