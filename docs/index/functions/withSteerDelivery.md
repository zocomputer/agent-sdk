[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / withSteerDelivery

# Function: withSteerDelivery()

> **withSteerDelivery**\<`TInput`, `TOutput`\>(`tool`, `inbox`): `ToolDefinition`\<`TInput`, `TOutput`\>

Defined in: [packages/agent-sdk/src/steer-tool.ts:37](https://github.com/zocomputer/zov2-code/blob/aba140d6dd71d0ea05075bf6e9ebcc5739f7a7b3/packages/agent-sdk/src/steer-tool.ts#L37)

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
