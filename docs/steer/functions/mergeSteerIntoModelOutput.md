[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [steer](../README.md) / mergeSteerIntoModelOutput

# Function: mergeSteerIntoModelOutput()

> **mergeSteerIntoModelOutput**(`output`, `messages`): [`SteerModelOutput`](../type-aliases/SteerModelOutput.md)

Defined in: [packages/agent-sdk/src/steer.ts:122](https://github.com/zocomputer/zov2-code/blob/a8636edc2f6184e686ebe291b26c3e5e9b3ae7ef/packages/agent-sdk/src/steer.ts#L122)

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
