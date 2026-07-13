[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [testing](../README.md) / createMockStoryModel

# Function: createMockStoryModel()

> **createMockStoryModel**(`options?`): `LanguageModelV4`

Defined in: [packages/agent-sdk/src/mock-model.ts:433](https://github.com/zocomputer/zov2-code/blob/2f680aef81cf6a147ceac91fe4d066f3e4aff1b6/packages/agent-sdk/src/mock-model.ts#L433)

Build a slow-streaming mock model for testing eve clients without inference
credentials: streams canned "story" text with configurable pacing or runs
scripted tool-call scenarios (`[mock:<scenario>]` in the user prompt).
Everything past the model call runs real — sessions, tools, hooks, framework.

## Parameters

### options?

[`MockStoryModelOptions`](../interfaces/MockStoryModelOptions.md) = `{}`

## Returns

`LanguageModelV4`
