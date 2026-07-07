[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / RedeliveryMessagePart

# Type Alias: RedeliveryMessagePart

> **RedeliveryMessagePart** = \{ `text`: `string`; `type`: `"text"`; \} \| \{ `data`: `string`; `filename`: `string`; `mediaType`: `string`; `type`: `"file"`; \}

Defined in: [packages/agent-sdk/src/redeliver.ts:53](https://github.com/zocomputer/zov2-code/blob/ca3547b2cec605405cb2885ac6f0edc660b55992/packages/agent-sdk/src/redeliver.ts#L53)

The message parts a redelivery turn sends (AI SDK `UserContent`-shaped).
