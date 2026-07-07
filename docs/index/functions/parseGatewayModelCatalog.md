[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / parseGatewayModelCatalog

# Function: parseGatewayModelCatalog()

> **parseGatewayModelCatalog**(`value`): [`GatewayModelInfo`](../interfaces/GatewayModelInfo.md)[] \| `null`

Defined in: [packages/agent-sdk/src/task.ts:326](https://github.com/zocomputer/zov2-code/blob/27ad75132e5ee857792f30c55f5617b1fdae5408/packages/agent-sdk/src/task.ts#L326)

Parse the gateway catalog response body
(`{ data: [{ id, name?, description? }, …] }`) into typed entries; `null`
on any malformed shape. Same catalog the AI SDK's
`gateway.getAvailableModels()` reads.

## Parameters

### value

`unknown`

## Returns

[`GatewayModelInfo`](../interfaces/GatewayModelInfo.md)[] \| `null`
