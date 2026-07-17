[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [testing](../README.md) / markdownChunks

# Function: markdownChunks()

> **markdownChunks**(): readonly `string`[]

Defined in: [packages/agent-sdk/src/mock-model.ts:140](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/mock-model.ts#L140)

Markdown chunks that deliberately split structure across deltas: a fence
opens in one delta and closes several later, table rows arrive one at a
time, list nesting grows mid-stream. A streaming renderer must keep the
trailing block stable through all of it.

## Returns

readonly `string`[]
