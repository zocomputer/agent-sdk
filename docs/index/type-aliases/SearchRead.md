[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SearchRead

# Type Alias: SearchRead

> **SearchRead** = \{ `content`: `string`; `kind`: `"text"`; \} \| \{ `bytes`: `number`; `kind`: `"too-large"`; \} \| \{ `kind`: `"binary"`; \} \| \{ `kind`: `"unreadable"`; \}

Defined in: [packages/agent-sdk/src/read-text.ts:11](https://github.com/zocomputer/zov2-code/blob/1fcc8b4b31cf28b6badb9d28c6512cd9261c730c/packages/agent-sdk/src/read-text.ts#L11)

The result of a bounded, binary-sniffed read for search tools.
