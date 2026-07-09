[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / RenderedWebText

# Interface: RenderedWebText

Defined in: [packages/agent-sdk/src/web-fetch.ts:158](https://github.com/zocomputer/zov2-code/blob/c013587aa4ecd77d27b6774cf5b1fead3e0418d5/packages/agent-sdk/src/web-fetch.ts#L158)

Rendered web page text: the converted/extracted content plus an optional
note when the render looks suspect (content collapse, raw HTML in markdown).

## Properties

### note?

> `readonly` `optional` **note?**: `string`

Defined in: [packages/agent-sdk/src/web-fetch.ts:161](https://github.com/zocomputer/zov2-code/blob/c013587aa4ecd77d27b6774cf5b1fead3e0418d5/packages/agent-sdk/src/web-fetch.ts#L161)

Honest-failure signal (content collapse, leftover raw HTML); absent when the render looks healthy.

***

### text

> `readonly` **text**: `string`

Defined in: [packages/agent-sdk/src/web-fetch.ts:159](https://github.com/zocomputer/zov2-code/blob/c013587aa4ecd77d27b6774cf5b1fead3e0418d5/packages/agent-sdk/src/web-fetch.ts#L159)
