[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / parseGatewayModelCatalog

# Function: parseGatewayModelCatalog()

> **parseGatewayModelCatalog**(`value`): [`GatewayModelInfo`](../interfaces/GatewayModelInfo.md)[] \| `null`

Defined in: [packages/agent-sdk/src/task.ts:283](https://github.com/zocomputer/zov2-code/blob/344fef7287e3cdac215bfeba4bb54fc2101e5e6e/packages/agent-sdk/src/task.ts#L283)

Parse the gateway catalog response body
(`{ data: [{ id, name?, description? }, …] }`) into typed entries; `null`
on any malformed shape. Same catalog the AI SDK's
`gateway.getAvailableModels()` reads.

## Parameters

### value

`unknown`

## Returns

[`GatewayModelInfo`](../interfaces/GatewayModelInfo.md)[] \| `null`
