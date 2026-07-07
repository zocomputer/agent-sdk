[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [steer](../README.md) / stripSteerFromOutput

# Function: stripSteerFromOutput()

> **stripSteerFromOutput**(`record`): `unknown`

Defined in: [packages/agent-sdk/src/steer.ts:84](https://github.com/zocomputer/zov2-code/blob/87d4918f2a9361e41a43075d722493e3ed6872e1/packages/agent-sdk/src/steer.ts#L84)

Inverse of `attachSteerToOutput`: drop the steer field and unwrap a
non-record original. Only unwraps when the wrapper key is the sole
remaining key, so a record that legitimately contains it survives.

## Parameters

### record

`Record`\<`string`, `unknown`\>

## Returns

`unknown`
