[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [testing](../README.md) / toolInputFragments

# Function: toolInputFragments()

> **toolInputFragments**(`inputJson`, `fragmentSize?`): readonly `string`[]

Defined in: [packages/agent-sdk/src/mock-model.ts:328](https://github.com/zocomputer/zov2-code/blob/af9677372192b613a9430e022ed9c3a186791633/packages/agent-sdk/src/mock-model.ts#L328)

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
