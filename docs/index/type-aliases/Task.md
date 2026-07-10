[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / Task

# Type Alias: Task

> **Task** = [`BaseTask`](../interfaces/BaseTask.md) & `object` \| [`BaseTask`](../interfaces/BaseTask.md) & `object` \| [`BaseTask`](../interfaces/BaseTask.md) & `object` \| [`BaseTask`](../interfaces/BaseTask.md) & `object`

Defined in: [packages/agent-sdk/src/async-tasks.ts:51](https://github.com/zocomputer/zov2-code/blob/9c31432d7362033dfbece45d1305011eb46c55ac/packages/agent-sdk/src/async-tasks.ts#L51)

Discriminated task union: running (no result yet), done (settled with a
result), error (failed), or lost (was running when the agent restarted).
