[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / FetchLike

# Type Alias: FetchLike

> **FetchLike** = (`url`, `init?`) => `Promise`\<`Response`\>

Defined in: [packages/agent-sdk/src/web-fetch.ts:207](https://github.com/zocomputer/zov2-code/blob/87d4918f2a9361e41a43075d722493e3ed6872e1/packages/agent-sdk/src/web-fetch.ts#L207)

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
