[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / renderWebText

# Function: renderWebText()

> **renderWebText**(`content`, `contentType`, `format`, `url`): [`RenderedWebText`](../interfaces/RenderedWebText.md)

Defined in: [packages/agent-sdk/src/web-fetch.ts:171](https://github.com/zocomputer/zov2-code/blob/aba140d6dd71d0ea05075bf6e9ebcc5739f7a7b3/packages/agent-sdk/src/web-fetch.ts#L171)

Render fetched text per the requested format; non-HTML (and format "html")
passes through untouched. For markdown/text, the page first reduces to its
main content with a metadata header (falling back to the whole document
when extraction can't find one), and a render that comes back suspiciously
empty or tag-heavy carries a note saying so.

## Parameters

### content

`string`

### contentType

`string`

### format

[`WebFetchFormat`](../type-aliases/WebFetchFormat.md)

### url

`string`

## Returns

[`RenderedWebText`](../interfaces/RenderedWebText.md)
