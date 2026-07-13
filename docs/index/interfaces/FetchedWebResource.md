[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / FetchedWebResource

# Interface: FetchedWebResource

Defined in: [packages/agent-sdk/src/web-fetch.ts:213](https://github.com/zocomputer/zov2-code/blob/1e24004df378afe2dca17754c9e6cedc76f36385/packages/agent-sdk/src/web-fetch.ts#L213)

A fetched HTTP resource: its body, Content-Type header, and the final URL
after redirects.

## Properties

### body

> `readonly` **body**: `Buffer`

Defined in: [packages/agent-sdk/src/web-fetch.ts:214](https://github.com/zocomputer/zov2-code/blob/1e24004df378afe2dca17754c9e6cedc76f36385/packages/agent-sdk/src/web-fetch.ts#L214)

***

### contentType

> `readonly` **contentType**: `string`

Defined in: [packages/agent-sdk/src/web-fetch.ts:216](https://github.com/zocomputer/zov2-code/blob/1e24004df378afe2dca17754c9e6cedc76f36385/packages/agent-sdk/src/web-fetch.ts#L216)

Raw `content-type` header value; empty string when absent.

***

### finalUrl

> `readonly` **finalUrl**: `string`

Defined in: [packages/agent-sdk/src/web-fetch.ts:218](https://github.com/zocomputer/zov2-code/blob/1e24004df378afe2dca17754c9e6cedc76f36385/packages/agent-sdk/src/web-fetch.ts#L218)

URL after redirects when the fetch implementation exposes it; else the request URL.
