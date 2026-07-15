[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / looksLikeHtml

# Function: looksLikeHtml()

> **looksLikeHtml**(`content`): `boolean`

Defined in: [packages/agent-sdk/src/web-fetch.ts:145](https://github.com/zocomputer/zov2-code/blob/1201055c5cc9e558bf15b3fd953dc08102ba49af/packages/agent-sdk/src/web-fetch.ts#L145)

Sniff content to detect HTML even when the Content-Type header is wrong or
missing. Checks for common HTML markers at the start of the content.

## Parameters

### content

`string`

## Returns

`boolean`
