[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / markdownChunks

# Function: markdownChunks()

> **markdownChunks**(): readonly `string`[]

Defined in: [packages/agent-sdk/src/mock-model.ts:128](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/mock-model.ts#L128)

Markdown chunks that deliberately split structure across deltas: a fence
opens in one delta and closes several later, table rows arrive one at a
time, list nesting grows mid-stream. A streaming renderer must keep the
trailing block stable through all of it.

## Returns

readonly `string`[]
