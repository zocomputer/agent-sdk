[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [gateway-fetch](../README.md) / FetchCall

# Type Alias: FetchCall

> **FetchCall** = (`input`, `init?`) => `Promise`\<`Response`\>

Defined in: [packages/runtime-ai/src/stream-guards.ts:27](https://github.com/zocomputer/zov2-code/blob/1201055c5cc9e558bf15b3fd953dc08102ba49af/packages/runtime-ai/src/stream-guards.ts#L27)

The fetch call signature alone: Bun's `typeof fetch` also carries
`preconnect`, which test doubles (and the wrapper itself) shouldn't have to
fake.

## Parameters

### input

`Parameters`\<[`FetchLike`](FetchLike.md)\>\[`0`\]

### init?

`Parameters`\<[`FetchLike`](FetchLike.md)\>\[`1`\]

## Returns

`Promise`\<`Response`\>
