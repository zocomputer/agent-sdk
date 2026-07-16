[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / readTextForSearch

# Function: readTextForSearch()

> **readTextForSearch**(`abs`, `maxBytes?`): [`SearchRead`](../type-aliases/SearchRead.md)

Defined in: [packages/agent-sdk/src/read-text.ts:18](https://github.com/zocomputer/zov2-code/blob/ff98edef5b507bf96c80f8f4c36882d827c8a81e/packages/agent-sdk/src/read-text.ts#L18)

Bounded read for search: stat before read so an oversized file is skipped without touching its bytes, and sniff raw bytes for NUL before decoding.

## Parameters

### abs

`string`

### maxBytes?

`number` = `MAX_SEARCH_FILE_BYTES`

## Returns

[`SearchRead`](../type-aliases/SearchRead.md)
