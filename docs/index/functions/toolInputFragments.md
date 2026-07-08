[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / toolInputFragments

# Function: toolInputFragments()

> **toolInputFragments**(`inputJson`, `fragmentSize?`): readonly `string`[]

Defined in: [packages/agent-sdk/src/mock-model.ts:316](https://github.com/zocomputer/zov2-code/blob/d15edc03b49c31d0244c34c64095ce9b88216fe1/packages/agent-sdk/src/mock-model.ts#L316)

Split a tool call's JSON input into small fragments, the way real models
stream tool arguments — so arg-streaming renderers see many partial-JSON
deltas, not one complete blob.

## Parameters

### inputJson

`string`

### fragmentSize?

`number` = `24`

## Returns

readonly `string`[]
