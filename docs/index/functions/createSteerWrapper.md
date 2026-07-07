[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createSteerWrapper

# Function: createSteerWrapper()

> **createSteerWrapper**(`inbox`): \<`TInput`, `TOutput`\>(`tool`) => `ToolDefinition`\<`TInput`, `TOutput`\>

Defined in: [packages/agent-sdk/src/steer-tool.ts:78](https://github.com/zocomputer/zov2-code/blob/ea2754383255c8c5c02ffe9d50fe4b5dbea37395/packages/agent-sdk/src/steer-tool.ts#L78)

A conditional wrapper for wiring call sites: identity when no inbox is
configured, `withSteerDelivery` otherwise.

## Parameters

### inbox

[`SteerSource`](../type-aliases/SteerSource.md) \| `null`

## Returns

\<`TInput`, `TOutput`\>(`tool`) => `ToolDefinition`\<`TInput`, `TOutput`\>
