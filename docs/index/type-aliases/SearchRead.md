[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SearchRead

# Type Alias: SearchRead

> **SearchRead** = \{ `content`: `string`; `kind`: `"text"`; \} \| \{ `bytes`: `number`; `kind`: `"too-large"`; \} \| \{ `kind`: `"binary"`; \} \| \{ `kind`: `"unreadable"`; \}

Defined in: [packages/agent-sdk/src/read-text.ts:11](https://github.com/zocomputer/zov2-code/blob/2f6c8cc3fd1672c6cd6d12c28dbf229ac82949b0/packages/agent-sdk/src/read-text.ts#L11)

The result of a bounded, binary-sniffed read for search tools.
