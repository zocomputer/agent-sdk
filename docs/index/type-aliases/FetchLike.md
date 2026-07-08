[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / FetchLike

# Type Alias: FetchLike

> **FetchLike** = (`url`, `init?`) => `Promise`\<`Response`\>

Defined in: [packages/agent-sdk/src/web-fetch.ts:207](https://github.com/zocomputer/zov2-code/blob/aba140d6dd71d0ea05075bf6e9ebcc5739f7a7b3/packages/agent-sdk/src/web-fetch.ts#L207)

The slice of `fetch` this module needs. Narrower than `typeof fetch` (Bun
adds a `preconnect` property to the global) so test stubs stay plain
functions.

## Parameters

### url

`string`

### init?

`RequestInit`

## Returns

`Promise`\<`Response`\>
