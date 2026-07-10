[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / markdownChunks

# Function: markdownChunks()

> **markdownChunks**(): readonly `string`[]

Defined in: [packages/agent-sdk/src/mock-model.ts:140](https://github.com/zocomputer/zov2-code/blob/2ecdaafb938b2184f882642908beb7b52901cb28/packages/agent-sdk/src/mock-model.ts#L140)

Markdown chunks that deliberately split structure across deltas: a fence
opens in one delta and closes several later, table rows arrive one at a
time, list nesting grows mid-stream. A streaming renderer must keep the
trailing block stable through all of it.

## Returns

readonly `string`[]
