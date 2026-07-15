[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / looksLikeHtml

# Function: looksLikeHtml()

> **looksLikeHtml**(`content`): `boolean`

Defined in: [packages/agent-sdk/src/web-fetch.ts:145](https://github.com/zocomputer/zov2-code/blob/8ddca74b7284f16fe6a147e3eb2a55bed9838617/packages/agent-sdk/src/web-fetch.ts#L145)

Sniff content to detect HTML even when the Content-Type header is wrong or
missing. Checks for common HTML markers at the start of the content.

## Parameters

### content

`string`

## Returns

`boolean`
