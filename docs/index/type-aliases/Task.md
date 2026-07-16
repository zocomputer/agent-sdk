[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / Task

# Type Alias: Task

> **Task** = [`BaseTask`](../interfaces/BaseTask.md) & `object` \| [`BaseTask`](../interfaces/BaseTask.md) & `object` \| [`BaseTask`](../interfaces/BaseTask.md) & `object` \| [`BaseTask`](../interfaces/BaseTask.md) & `object`

Defined in: [packages/agent-sdk/src/async-tasks.ts:51](https://github.com/zocomputer/zov2-code/blob/f95a48c7e1f1a7b1961c045374fb5540573a3627/packages/agent-sdk/src/async-tasks.ts#L51)

Discriminated task union: running (no result yet), done (settled with a
result), error (failed), or lost (was running when the agent restarted).
