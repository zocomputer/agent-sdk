[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / Task

# Type Alias: Task

> **Task** = [`BaseTask`](../interfaces/BaseTask.md) & `object` \| [`BaseTask`](../interfaces/BaseTask.md) & `object` \| [`BaseTask`](../interfaces/BaseTask.md) & `object` \| [`BaseTask`](../interfaces/BaseTask.md) & `object`

Defined in: [packages/agent-sdk/src/async-tasks.ts:86](https://github.com/zocomputer/zov2-code/blob/431612973a5c06efcad7920699932d7fe7145ddd/packages/agent-sdk/src/async-tasks.ts#L86)

Discriminated task union: running (no result yet), done (settled with a
result), error (failed), or lost (was running when the agent restarted).
