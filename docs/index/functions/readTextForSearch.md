[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / readTextForSearch

# Function: readTextForSearch()

> **readTextForSearch**(`abs`, `maxBytes?`): [`SearchRead`](../type-aliases/SearchRead.md)

Defined in: [packages/agent-sdk/src/read-text.ts:18](https://github.com/zocomputer/zov2-code/blob/4567e46fc689740ed814c3b4b8b1101dff80bfbe/packages/agent-sdk/src/read-text.ts#L18)

Bounded read for search: stat before read so an oversized file is skipped without touching its bytes, and sniff raw bytes for NUL before decoding.

## Parameters

### abs

`string`

### maxBytes?

`number` = `MAX_SEARCH_FILE_BYTES`

## Returns

[`SearchRead`](../type-aliases/SearchRead.md)
