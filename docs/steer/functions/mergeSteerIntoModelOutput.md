[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [steer](../README.md) / mergeSteerIntoModelOutput

# Function: mergeSteerIntoModelOutput()

> **mergeSteerIntoModelOutput**(`output`, `messages`): [`SteerModelOutput`](../type-aliases/SteerModelOutput.md)

Defined in: [packages/agent-sdk/src/steer.ts:122](https://github.com/zocomputer/zov2-code/blob/1e3454bf19fec73047afd6e825710b7db25d004a/packages/agent-sdk/src/steer.ts#L122)

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
