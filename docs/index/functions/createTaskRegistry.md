[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createTaskRegistry

# Function: createTaskRegistry()

> **createTaskRegistry**(`opts`): [`TaskRegistry`](../interfaces/TaskRegistry.md)

Defined in: [packages/agent-sdk/src/async-tasks.ts:204](https://github.com/zocomputer/zov2-code/blob/8ddca74b7284f16fe6a147e3eb2a55bed9838617/packages/agent-sdk/src/async-tasks.ts#L204)

Create a task registry backed by a JSON store. Registries are deduped per
`storePath` on `globalThis` so multiple module copies (across rebuilds or
static vs dynamic exports) converge on one instance.

## Parameters

### opts

#### storePath

`string`

## Returns

[`TaskRegistry`](../interfaces/TaskRegistry.md)
