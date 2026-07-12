[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SearchRead

# Type Alias: SearchRead

> **SearchRead** = \{ `content`: `string`; `kind`: `"text"`; \} \| \{ `bytes`: `number`; `kind`: `"too-large"`; \} \| \{ `kind`: `"binary"`; \} \| \{ `kind`: `"unreadable"`; \}

Defined in: [packages/agent-sdk/src/read-text.ts:11](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/read-text.ts#L11)

The result of a bounded, binary-sniffed read for search tools.
