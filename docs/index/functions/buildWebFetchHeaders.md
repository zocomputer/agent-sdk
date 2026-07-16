[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / buildWebFetchHeaders

# Function: buildWebFetchHeaders()

> **buildWebFetchHeaders**(`format`, `userAgent?`): `Record`\<`string`, `string`\>

Defined in: [packages/agent-sdk/src/web-fetch.ts:58](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/web-fetch.ts#L58)

Build request headers for a webfetch: Accept q-values per format,
Accept-Language, and User-Agent.

## Parameters

### format

[`WebFetchFormat`](../type-aliases/WebFetchFormat.md)

### userAgent?

`string` = `BROWSER_USER_AGENT`

## Returns

`Record`\<`string`, `string`\>
