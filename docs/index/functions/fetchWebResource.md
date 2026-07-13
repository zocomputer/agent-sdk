[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / fetchWebResource

# Function: fetchWebResource()

> **fetchWebResource**(`opts`): `Promise`\<[`FetchedWebResource`](../interfaces/FetchedWebResource.md)\>

Defined in: [packages/agent-sdk/src/web-fetch.ts:238](https://github.com/zocomputer/zov2-code/blob/440b57200b266cf1c7309b270db9220db760c77a/packages/agent-sdk/src/web-fetch.ts#L238)

GET a URL with the standard headers, the Cloudflare-challenge retry, and the
response-size cap. Throws on non-2xx, oversized, or timed-out responses.

## Parameters

### opts

#### fetchImpl?

[`FetchLike`](../type-aliases/FetchLike.md)

#### format

[`WebFetchFormat`](../type-aliases/WebFetchFormat.md)

#### pdfTimeoutMs?

`number`

Deadline (from request start) to extend to when the response headers
reveal a PDF the request URL didn't — a redirect to `.pdf` or an
extensionless URL served as `application/pdf`. Omit when the caller set
an explicit timeout, which always wins.

#### timeoutMs

`number`

#### url

`string`

## Returns

`Promise`\<[`FetchedWebResource`](../interfaces/FetchedWebResource.md)\>
