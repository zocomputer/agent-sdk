[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createSteerWrapper

# Function: createSteerWrapper()

> **createSteerWrapper**(`inbox`): \<`TInput`, `TOutput`\>(`tool`) => `ToolDefinition`\<`TInput`, `TOutput`\>

Defined in: [packages/agent-sdk/src/steer-tool.ts:78](https://github.com/zocomputer/zov2-code/blob/1e3454bf19fec73047afd6e825710b7db25d004a/packages/agent-sdk/src/steer-tool.ts#L78)

A conditional wrapper for wiring call sites: identity when no inbox is
configured, `withSteerDelivery` otherwise.

## Parameters

### inbox

[`SteerSource`](../type-aliases/SteerSource.md) \| `null`

## Returns

\<`TInput`, `TOutput`\>(`tool`) => `ToolDefinition`\<`TInput`, `TOutput`\>
