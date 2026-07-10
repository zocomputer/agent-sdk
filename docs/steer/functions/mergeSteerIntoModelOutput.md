[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [steer](../README.md) / mergeSteerIntoModelOutput

# Function: mergeSteerIntoModelOutput()

> **mergeSteerIntoModelOutput**(`output`, `messages`): [`SteerModelOutput`](../type-aliases/SteerModelOutput.md)

Defined in: [packages/agent-sdk/src/steer.ts:122](https://github.com/zocomputer/zov2-code/blob/9c31432d7362033dfbece45d1305011eb46c55ac/packages/agent-sdk/src/steer.ts#L122)

Merge steered messages into a tool's already-narrowed model output: text
outputs get the rendered block appended, json outputs get the field
re-attached.

## Parameters

### output

[`SteerModelOutput`](../type-aliases/SteerModelOutput.md)

### messages

readonly [`SteerMessage`](../interfaces/SteerMessage.md)[]

## Returns

[`SteerModelOutput`](../type-aliases/SteerModelOutput.md)
