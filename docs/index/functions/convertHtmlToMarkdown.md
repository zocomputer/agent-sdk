[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / convertHtmlToMarkdown

# Function: convertHtmlToMarkdown()

> **convertHtmlToMarkdown**(`html`): `string`

Defined in: [packages/agent-sdk/src/web-fetch.ts:74](https://github.com/zocomputer/zov2-code/blob/ad31c397882c72b933077cb2108bebb0430d6e9d/packages/agent-sdk/src/web-fetch.ts#L74)

Convert HTML to markdown via TurndownService, parsing with linkedom instead
of handing turndown a string directly so polyfilled DOM hosts (happy-dom
test preloads) don't silently collapse the output to an empty string.

## Parameters

### html

`string`

## Returns

`string`
