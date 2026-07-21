[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / convertHtmlToMarkdown

# Function: convertHtmlToMarkdown()

> **convertHtmlToMarkdown**(`html`): `string`

Defined in: [packages/agent-sdk/src/web-fetch.ts:74](https://github.com/zocomputer/zov2-code/blob/431612973a5c06efcad7920699932d7fe7145ddd/packages/agent-sdk/src/web-fetch.ts#L74)

Convert HTML to markdown via TurndownService, parsing with linkedom instead
of handing turndown a string directly so polyfilled DOM hosts (happy-dom
test preloads) don't silently collapse the output to an empty string.

## Parameters

### html

`string`

## Returns

`string`
