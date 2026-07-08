[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createTaskRegistry

# Function: createTaskRegistry()

> **createTaskRegistry**(`opts`): [`TaskRegistry`](../interfaces/TaskRegistry.md)

Defined in: [packages/agent-sdk/src/async-tasks.ts:131](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/async-tasks.ts#L131)

Create a task registry backed by a JSON store. Registries are deduped per
`storePath` on `globalThis` so multiple module copies (across rebuilds or
static vs dynamic exports) converge on one instance.

## Parameters

### opts

#### storePath

`string`

## Returns

[`TaskRegistry`](../interfaces/TaskRegistry.md)
