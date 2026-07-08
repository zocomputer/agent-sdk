[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / buildWebFetchHeaders

# Function: buildWebFetchHeaders()

> **buildWebFetchHeaders**(`format`, `userAgent?`): `Record`\<`string`, `string`\>

Defined in: [packages/agent-sdk/src/web-fetch.ts:58](https://github.com/zocomputer/zov2-code/blob/a8636edc2f6184e686ebe291b26c3e5e9b3ae7ef/packages/agent-sdk/src/web-fetch.ts#L58)

Build request headers for a webfetch: Accept q-values per format,
Accept-Language, and User-Agent.

## Parameters

### format

[`WebFetchFormat`](../type-aliases/WebFetchFormat.md)

### userAgent?

`string` = `BROWSER_USER_AGENT`

## Returns

`Record`\<`string`, `string`\>
