[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [testing](../README.md) / createMockStoryModel

# Function: createMockStoryModel()

> **createMockStoryModel**(`options?`): `LanguageModelV4`

Defined in: [packages/agent-sdk/src/mock-model.ts:433](https://github.com/zocomputer/zov2-code/blob/ea094c0d7d3efd4351c48b5c1bd38d95a1836e8d/packages/agent-sdk/src/mock-model.ts#L433)

Build a slow-streaming mock model for testing eve clients without inference
credentials: streams canned "story" text with configurable pacing or runs
scripted tool-call scenarios (`[mock:<scenario>]` in the user prompt).
Everything past the model call runs real — sessions, tools, hooks, framework.

## Parameters

### options?

[`MockStoryModelOptions`](../interfaces/MockStoryModelOptions.md) = `{}`

## Returns

`LanguageModelV4`
