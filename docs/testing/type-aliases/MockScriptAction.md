[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [testing](../README.md) / MockScriptAction

# Type Alias: MockScriptAction

> **MockScriptAction** = \{ `calls`: readonly [`MockToolCall`](../interfaces/MockToolCall.md)[]; `kind`: `"tool-calls"`; \} \| \{ `kind`: `"text"`; `text`: `string`; \}

Defined in: [packages/agent-sdk/src/mock-model.ts:130](https://github.com/zocomputer/zov2-code/blob/178825142421d42c04f57b0afbc80612a16fe4c6/packages/agent-sdk/src/mock-model.ts#L130)

The scripted action for a scenario at a step: one or more tool calls emitted
in a single response (plural = parallel tool calls), or a wrap-up text that
ends the turn.
