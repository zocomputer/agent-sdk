[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createTaskRegistry

# Function: createTaskRegistry()

> **createTaskRegistry**(`opts`): [`TaskRegistry`](../interfaces/TaskRegistry.md)

Defined in: [packages/agent-sdk/src/async-tasks.ts:131](https://github.com/zocomputer/zov2-code/blob/ad31c397882c72b933077cb2108bebb0430d6e9d/packages/agent-sdk/src/async-tasks.ts#L131)

Create a task registry backed by a JSON store. Registries are deduped per
`storePath` on `globalThis` so multiple module copies (across rebuilds or
static vs dynamic exports) converge on one instance.

## Parameters

### opts

#### storePath

`string`

## Returns

[`TaskRegistry`](../interfaces/TaskRegistry.md)
