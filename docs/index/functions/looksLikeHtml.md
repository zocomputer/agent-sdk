[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / looksLikeHtml

# Function: looksLikeHtml()

> **looksLikeHtml**(`content`): `boolean`

Defined in: [packages/agent-sdk/src/web-fetch.ts:145](https://github.com/zocomputer/zov2-code/blob/ff98edef5b507bf96c80f8f4c36882d827c8a81e/packages/agent-sdk/src/web-fetch.ts#L145)

Sniff content to detect HTML even when the Content-Type header is wrong or
missing. Checks for common HTML markers at the start of the content.

## Parameters

### content

`string`

## Returns

`boolean`
