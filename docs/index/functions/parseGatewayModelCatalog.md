[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / parseGatewayModelCatalog

# Function: parseGatewayModelCatalog()

> **parseGatewayModelCatalog**(`value`): [`GatewayModelInfo`](../interfaces/GatewayModelInfo.md)[] \| `null`

Defined in: [packages/agent-sdk/src/task.ts:283](https://github.com/zocomputer/zov2-code/blob/9538a0a8ac4443391049ca02b620175fec05d4cd/packages/agent-sdk/src/task.ts#L283)

Parse the gateway catalog response body
(`{ data: [{ id, name?, description? }, …] }`) into typed entries; `null`
on any malformed shape. Same catalog the AI SDK's
`gateway.getAvailableModels()` reads.

## Parameters

### value

`unknown`

## Returns

[`GatewayModelInfo`](../interfaces/GatewayModelInfo.md)[] \| `null`
