[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [steer](../README.md) / readSteerMessages

# Function: readSteerMessages()

> **readSteerMessages**(`output`): [`SteerMessage`](../interfaces/SteerMessage.md)[] \| `null`

Defined in: [packages/agent-sdk/src/steer.ts:98](https://github.com/zocomputer/zov2-code/blob/d124383bcfcf0ca6d96b92bff96fa6dfccc07562/packages/agent-sdk/src/steer.ts#L98)

Read the steered messages off a tool output, structurally validated.
Returns null when the output isn't a record, carries no steer payload, or
the payload holds no well-formed message; malformed entries are dropped.

## Parameters

### output

`unknown`

## Returns

[`SteerMessage`](../interfaces/SteerMessage.md)[] \| `null`
