[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / MockScriptAction

# Type Alias: MockScriptAction

> **MockScriptAction** = \{ `calls`: readonly [`MockToolCall`](../interfaces/MockToolCall.md)[]; `kind`: `"tool-calls"`; \} \| \{ `kind`: `"text"`; `text`: `string`; \}

Defined in: [packages/agent-sdk/src/mock-model.ts:118](https://github.com/zocomputer/zov2-code/blob/2004eea2e2488195525555d1ec03711235aadc63/packages/agent-sdk/src/mock-model.ts#L118)

The scripted action for a scenario at a step: one or more tool calls emitted
in a single response (plural = parallel tool calls), or a wrap-up text that
ends the turn.
