[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createTaskAgent

# Function: createTaskAgent()

> **createTaskAgent**(`options`): `object`

Defined in: [packages/agent-sdk/src/task.ts:223](https://github.com/zocomputer/zov2-code/blob/f537e0a90da222390e69bcbf7e329142b9e8d4b0/packages/agent-sdk/src/task.ts#L223)

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

> **model**: `PublicAgentModelDefinition` = `options.model`

### modelContextWindowTokens?

> `optional` **modelContextWindowTokens?**: `number` = `options.modelContextWindowTokens`

### modelOptions?

> `optional` **modelOptions?**: `AgentModelOptionsDefinition`

### reasoning?

> `optional` **reasoning?**: `AgentReasoningDefinition` = `options.reasoning`
