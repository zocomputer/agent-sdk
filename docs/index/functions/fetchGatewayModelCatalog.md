[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / fetchGatewayModelCatalog

# Function: fetchGatewayModelCatalog()

> **fetchGatewayModelCatalog**(`options?`): `Promise`\<[`GatewayModelInfo`](../interfaces/GatewayModelInfo.md)[]\>

Defined in: [packages/agent-sdk/src/task.ts:407](https://github.com/zocomputer/zov2-code/blob/0bb195a93a5e8bd5814dac23311408353312bc4f/packages/agent-sdk/src/task.ts#L407)

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
