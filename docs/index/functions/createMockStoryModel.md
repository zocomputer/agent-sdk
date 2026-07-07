[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createMockStoryModel

# Function: createMockStoryModel()

> **createMockStoryModel**(`options?`): `LanguageModelV4`

Defined in: [packages/agent-sdk/src/mock-model.ts:333](https://github.com/zocomputer/zov2-code/blob/ad31c397882c72b933077cb2108bebb0430d6e9d/packages/agent-sdk/src/mock-model.ts#L333)

Build a slow-streaming mock model for testing eve clients without inference
credentials: streams canned "story" text with configurable pacing or runs
scripted tool-call scenarios (`[mock:<scenario>]` in the user prompt).
Everything past the model call runs real — sessions, tools, hooks, framework.

## Parameters

### options?

[`MockStoryModelOptions`](../interfaces/MockStoryModelOptions.md) = `{}`

## Returns

`LanguageModelV4`
