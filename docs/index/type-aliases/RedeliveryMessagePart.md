[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / RedeliveryMessagePart

# Type Alias: RedeliveryMessagePart

> **RedeliveryMessagePart** = \{ `text`: `string`; `type`: `"text"`; \} \| \{ `data`: `string`; `filename`: `string`; `mediaType`: `string`; `type`: `"file"`; \}

Defined in: [packages/agent-sdk/src/redeliver.ts:53](https://github.com/zocomputer/zov2-code/blob/1e3454bf19fec73047afd6e825710b7db25d004a/packages/agent-sdk/src/redeliver.ts#L53)

The message parts a redelivery turn sends (AI SDK `UserContent`-shaped).
