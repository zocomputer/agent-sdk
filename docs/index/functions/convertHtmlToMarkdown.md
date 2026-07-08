[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / convertHtmlToMarkdown

# Function: convertHtmlToMarkdown()

> **convertHtmlToMarkdown**(`html`): `string`

Defined in: [packages/agent-sdk/src/web-fetch.ts:74](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/web-fetch.ts#L74)

Convert HTML to markdown via TurndownService, parsing with linkedom instead
of handing turndown a string directly so polyfilled DOM hosts (happy-dom
test preloads) don't silently collapse the output to an empty string.

## Parameters

### html

`string`

## Returns

`string`
