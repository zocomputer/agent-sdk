[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / BaseTask

# Interface: BaseTask

Defined in: [packages/agent-sdk/src/async-tasks.ts:32](https://github.com/zocomputer/zov2-code/blob/344fef7287e3cdac215bfeba4bb54fc2101e5e6e/packages/agent-sdk/src/async-tasks.ts#L32)

Fields every task carries regardless of status — see `Task`.

## Properties

### id

> `readonly` **id**: `string`

Defined in: [packages/agent-sdk/src/async-tasks.ts:33](https://github.com/zocomputer/zov2-code/blob/344fef7287e3cdac215bfeba4bb54fc2101e5e6e/packages/agent-sdk/src/async-tasks.ts#L33)

***

### label

> `readonly` **label**: `string`

Defined in: [packages/agent-sdk/src/async-tasks.ts:35](https://github.com/zocomputer/zov2-code/blob/344fef7287e3cdac215bfeba4bb54fc2101e5e6e/packages/agent-sdk/src/async-tasks.ts#L35)

Short human label, e.g. the command or query.

***

### progress?

> `readonly` `optional` **progress?**: `unknown`

Defined in: [packages/agent-sdk/src/async-tasks.ts:44](https://github.com/zocomputer/zov2-code/blob/344fef7287e3cdac215bfeba4bb54fc2101e5e6e/packages/agent-sdk/src/async-tasks.ts#L44)

***

### sessionId?

> `readonly` `optional` **sessionId?**: `string`

Defined in: [packages/agent-sdk/src/async-tasks.ts:42](https://github.com/zocomputer/zov2-code/blob/344fef7287e3cdac215bfeba4bb54fc2101e5e6e/packages/agent-sdk/src/async-tasks.ts#L42)

Session that spawned the task; scopes `listTasks`. Absent for tasks
spawned without a tool context (tests, direct registry use).

***

### startedAt

> `readonly` **startedAt**: `number`

Defined in: [packages/agent-sdk/src/async-tasks.ts:43](https://github.com/zocomputer/zov2-code/blob/344fef7287e3cdac215bfeba4bb54fc2101e5e6e/packages/agent-sdk/src/async-tasks.ts#L43)

***

### tool

> `readonly` **tool**: `string`

Defined in: [packages/agent-sdk/src/async-tasks.ts:37](https://github.com/zocomputer/zov2-code/blob/344fef7287e3cdac215bfeba4bb54fc2101e5e6e/packages/agent-sdk/src/async-tasks.ts#L37)

Which backgroundable op produced this task.
