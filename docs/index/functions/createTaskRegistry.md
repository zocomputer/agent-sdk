[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createTaskRegistry

# Function: createTaskRegistry()

> **createTaskRegistry**(`opts`): [`TaskRegistry`](../interfaces/TaskRegistry.md)

Defined in: [packages/agent-sdk/src/async-tasks.ts:239](https://github.com/zocomputer/zov2-code/blob/c064bb48e9a6d214ad3688019aaf958920a35455/packages/agent-sdk/src/async-tasks.ts#L239)

Create a task registry backed by a JSON store. Registries are deduped per
`storePath` and ABI on `globalThis` so compatible module copies (across
rebuilds or static vs dynamic exports) converge on one instance.

## Parameters

### opts

#### newTaskId?

() => `string`

Test seam for deterministic ids; production uses `crypto.randomUUID`.

#### storePath

`string`

JSON persistence path owned by the caller.

## Returns

[`TaskRegistry`](../interfaces/TaskRegistry.md)
