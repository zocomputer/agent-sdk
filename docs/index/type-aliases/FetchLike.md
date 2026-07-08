[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / FetchLike

# Type Alias: FetchLike

> **FetchLike** = (`url`, `init?`) => `Promise`\<`Response`\>

Defined in: [packages/agent-sdk/src/web-fetch.ts:207](https://github.com/zocomputer/zov2-code/blob/a8636edc2f6184e686ebe291b26c3e5e9b3ae7ef/packages/agent-sdk/src/web-fetch.ts#L207)

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
