[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [testing](../README.md) / MockScriptAction

# Type Alias: MockScriptAction

> **MockScriptAction** = \{ `calls`: readonly [`MockToolCall`](../interfaces/MockToolCall.md)[]; `kind`: `"tool-calls"`; \} \| \{ `kind`: `"text"`; `text`: `string`; \}

Defined in: [packages/agent-sdk/src/mock-model.ts:130](https://github.com/zocomputer/zov2-code/blob/9538a0a8ac4443391049ca02b620175fec05d4cd/packages/agent-sdk/src/mock-model.ts#L130)

The scripted action for a scenario at a step: one or more tool calls emitted
in a single response (plural = parallel tool calls), or a wrap-up text that
ends the turn.
