[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createSteerWrapper

# Function: createSteerWrapper()

> **createSteerWrapper**(`inbox`): \<`TInput`, `TOutput`\>(`tool`) => `ToolDefinition`\<`TInput`, `TOutput`\>

Defined in: [packages/agent-sdk/src/steer-tool.ts:78](https://github.com/zocomputer/zov2-code/blob/86e2b5a89599cc09df999181d86a1667b22c1929/packages/agent-sdk/src/steer-tool.ts#L78)

A conditional wrapper for wiring call sites: identity when no inbox is
configured, `withSteerDelivery` otherwise.

## Parameters

### inbox

[`SteerSource`](../type-aliases/SteerSource.md) \| `null`

## Returns

\<`TInput`, `TOutput`\>(`tool`) => `ToolDefinition`\<`TInput`, `TOutput`\>
