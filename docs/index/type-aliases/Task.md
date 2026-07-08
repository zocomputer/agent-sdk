[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / Task

# Type Alias: Task

> **Task** = [`BaseTask`](../interfaces/BaseTask.md) & `object` \| [`BaseTask`](../interfaces/BaseTask.md) & `object` \| [`BaseTask`](../interfaces/BaseTask.md) & `object` \| [`BaseTask`](../interfaces/BaseTask.md) & `object`

Defined in: [packages/agent-sdk/src/async-tasks.ts:46](https://github.com/zocomputer/zov2-code/blob/e246fc7c6576db819f4636c288ce8b7c7818f506/packages/agent-sdk/src/async-tasks.ts#L46)

Discriminated task union: running (no result yet), done (settled with a
result), error (failed), or lost (was running when the agent restarted).
