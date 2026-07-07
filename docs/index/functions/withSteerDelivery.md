[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / withSteerDelivery

# Function: withSteerDelivery()

> **withSteerDelivery**\<`TInput`, `TOutput`\>(`tool`, `inbox`): `ToolDefinition`\<`TInput`, `TOutput`\>

Defined in: [packages/agent-sdk/src/steer-tool.ts:37](https://github.com/zocomputer/zov2-code/blob/ea2754383255c8c5c02ffe9d50fe4b5dbea37395/packages/agent-sdk/src/steer-tool.ts#L37)

Wrap one tool with steer delivery. Structurally output-preserving for
record outputs (the steer field spreads in alongside the tool's own keys);
a non-record output is wrapped when steers are pending, which the
`toModelOutput` seam undoes before the tool's own projection runs.

## Type Parameters

### TInput

`TInput`

### TOutput

`TOutput`

## Parameters

### tool

`ToolDefinition`\<`TInput`, `TOutput`\>

### inbox

[`SteerSource`](../type-aliases/SteerSource.md)

## Returns

`ToolDefinition`\<`TInput`, `TOutput`\>
