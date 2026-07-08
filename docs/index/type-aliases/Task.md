[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / Task

# Type Alias: Task

> **Task** = [`BaseTask`](../interfaces/BaseTask.md) & `object` \| [`BaseTask`](../interfaces/BaseTask.md) & `object` \| [`BaseTask`](../interfaces/BaseTask.md) & `object` \| [`BaseTask`](../interfaces/BaseTask.md) & `object`

Defined in: [packages/agent-sdk/src/async-tasks.ts:46](https://github.com/zocomputer/zov2-code/blob/5cd4dc50234e29b61bac1ae63f95c9b3f3a18361/packages/agent-sdk/src/async-tasks.ts#L46)

Discriminated task union: running (no result yet), done (settled with a
result), error (failed), or lost (was running when the agent restarted).
