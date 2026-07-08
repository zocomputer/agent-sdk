[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [gateway-fetch](../README.md) / FetchCall

# Type Alias: FetchCall

> **FetchCall** = (`input`, `init?`) => `Promise`\<`Response`\>

Defined in: [packages/agent-sdk/src/gateway-fetch.ts:24](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/gateway-fetch.ts#L24)

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
