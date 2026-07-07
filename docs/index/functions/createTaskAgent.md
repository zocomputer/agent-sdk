[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createTaskAgent

# Function: createTaskAgent()

> **createTaskAgent**(`options`): `object`

Defined in: [packages/agent-sdk/src/task.ts:273](https://github.com/zocomputer/zov2-code/blob/ca3547b2cec605405cb2885ac6f0edc660b55992/packages/agent-sdk/src/task.ts#L273)

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

### description

> **description**: `string`

### model

> **model**: `LanguageModel` = `options.model`

### reasoning?

> `optional` **reasoning?**: `AgentReasoningDefinition` = `options.reasoning`
