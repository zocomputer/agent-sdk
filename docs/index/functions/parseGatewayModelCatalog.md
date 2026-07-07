[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / parseGatewayModelCatalog

# Function: parseGatewayModelCatalog()

> **parseGatewayModelCatalog**(`value`): [`GatewayModelInfo`](../interfaces/GatewayModelInfo.md)[] \| `null`

Defined in: [packages/agent-sdk/src/task.ts:303](https://github.com/zocomputer/zov2-code/blob/ca3547b2cec605405cb2885ac6f0edc660b55992/packages/agent-sdk/src/task.ts#L303)

Parse the gateway catalog response body
(`{ data: [{ id, name?, description? }, …] }`) into typed entries; `null`
on any malformed shape. Same catalog the AI SDK's
`gateway.getAvailableModels()` reads.

## Parameters

### value

`unknown`

## Returns

[`GatewayModelInfo`](../interfaces/GatewayModelInfo.md)[] \| `null`
