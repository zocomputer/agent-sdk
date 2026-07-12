[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createTaskAgent

# Function: createTaskAgent()

> **createTaskAgent**(`options`): `object`

Defined in: [packages/agent-sdk/src/task.ts:221](https://github.com/zocomputer/zov2-code/blob/1fcc8b4b31cf28b6badb9d28c6512cd9261c730c/packages/agent-sdk/src/task.ts#L221)

The `defineAgent` config for a consumer's
`agent/subagents/task_<tier>/agent.ts`. The description is what the parent
model reads to pick a tier — it carries the model's identity, the
when-to-pick-it guidance, and the delegation contract, so the default is
written for the parent, not the child.

## Parameters

### options

[`TaskAgentOptions`](../interfaces/TaskAgentOptions.md)

## Returns

`object`

### build?

> `optional` **build?**: `AgentBuildDefinition` = `options.build`

### description

> **description**: `string`

### model

> **model**: `LanguageModel` = `options.model`

### modelOptions?

> `optional` **modelOptions?**: `AgentModelOptionsDefinition`

### reasoning?

> `optional` **reasoning?**: `AgentReasoningDefinition` = `options.reasoning`
