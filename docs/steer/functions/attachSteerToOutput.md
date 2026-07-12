[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [steer](../README.md) / attachSteerToOutput

# Function: attachSteerToOutput()

> **attachSteerToOutput**(`output`, `messages`): `Record`\<`string`, `unknown`\>

Defined in: [packages/agent-sdk/src/steer.ts:65](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/steer.ts#L65)

Attach steered messages to a tool output. A record output keeps its own
keys with the payload spread in alongside (merging with any messages a
previous attach already carried); a non-record output is wrapped so
`stripSteerFromOutput` can recover it exactly.

## Parameters

### output

`unknown`

### messages

readonly [`SteerMessage`](../interfaces/SteerMessage.md)[]

## Returns

`Record`\<`string`, `unknown`\>
