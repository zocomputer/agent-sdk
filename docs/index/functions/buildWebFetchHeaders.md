[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / buildWebFetchHeaders

# Function: buildWebFetchHeaders()

> **buildWebFetchHeaders**(`format`, `userAgent?`): `Record`\<`string`, `string`\>

Defined in: [packages/agent-sdk/src/web-fetch.ts:58](https://github.com/zocomputer/zov2-code/blob/ff98edef5b507bf96c80f8f4c36882d827c8a81e/packages/agent-sdk/src/web-fetch.ts#L58)

Build request headers for a webfetch: Accept q-values per format,
Accept-Language, and User-Agent.

## Parameters

### format

[`WebFetchFormat`](../type-aliases/WebFetchFormat.md)

### userAgent?

`string` = `BROWSER_USER_AGENT`

## Returns

`Record`\<`string`, `string`\>
