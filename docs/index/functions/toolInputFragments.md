[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / toolInputFragments

# Function: toolInputFragments()

> **toolInputFragments**(`inputJson`, `fragmentSize?`): readonly `string`[]

Defined in: [packages/agent-sdk/src/mock-model.ts:328](https://github.com/zocomputer/zov2-code/blob/440b57200b266cf1c7309b270db9220db760c77a/packages/agent-sdk/src/mock-model.ts#L328)

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
