[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / TaskRegistry

# Interface: TaskRegistry

Defined in: [packages/agent-sdk/src/async-tasks.ts:56](https://github.com/zocomputer/zov2-code/blob/346fe3cc1f4b2813234e8cc0980e7a87e8c918ea/packages/agent-sdk/src/async-tasks.ts#L56)

Background task registry: spawn work and return an id immediately, list/get
task state, update progress, and await settlement with a timeout.

## Methods

### awaitTask()

> **awaitTask**(`id`, `waitMs`): `Promise`\<[`Task`](../type-aliases/Task.md) \| `undefined`\>

Defined in: [packages/agent-sdk/src/async-tasks.ts:69](https://github.com/zocomputer/zov2-code/blob/346fe3cc1f4b2813234e8cc0980e7a87e8c918ea/packages/agent-sdk/src/async-tasks.ts#L69)

Block until the task settles or `waitMs` elapses, then return its current
state (still "running" if the wait timed out). Undefined for an unknown id.

#### Parameters

##### id

`string`

##### waitMs

`number`

#### Returns

`Promise`\<[`Task`](../type-aliases/Task.md) \| `undefined`\>

***

### getTask()

> **getTask**(`id`): [`Task`](../type-aliases/Task.md) \| `undefined`

Defined in: [packages/agent-sdk/src/async-tasks.ts:64](https://github.com/zocomputer/zov2-code/blob/346fe3cc1f4b2813234e8cc0980e7a87e8c918ea/packages/agent-sdk/src/async-tasks.ts#L64)

Retrieve one task by id; undefined when not found.

#### Parameters

##### id

`string`

#### Returns

[`Task`](../type-aliases/Task.md) \| `undefined`

***

### listTasks()

> **listTasks**(): [`Task`](../type-aliases/Task.md)[]

Defined in: [packages/agent-sdk/src/async-tasks.ts:62](https://github.com/zocomputer/zov2-code/blob/346fe3cc1f4b2813234e8cc0980e7a87e8c918ea/packages/agent-sdk/src/async-tasks.ts#L62)

List all tasks, sorted by start time.

#### Returns

[`Task`](../type-aliases/Task.md)[]

***

### spawnTask()

> **spawnTask**(`tool`, `label`, `work`): `string`

Defined in: [packages/agent-sdk/src/async-tasks.ts:58](https://github.com/zocomputer/zov2-code/blob/346fe3cc1f4b2813234e8cc0980e7a87e8c918ea/packages/agent-sdk/src/async-tasks.ts#L58)

Register `work` as a background task and return its id immediately.

#### Parameters

##### tool

`string`

##### label

`string`

##### work

`Promise`\<`unknown`\>

#### Returns

`string`

***

### updateTaskProgress()

> **updateTaskProgress**(`id`, `progress`): `void`

Defined in: [packages/agent-sdk/src/async-tasks.ts:60](https://github.com/zocomputer/zov2-code/blob/346fe3cc1f4b2813234e8cc0980e7a87e8c918ea/packages/agent-sdk/src/async-tasks.ts#L60)

Update a running task's progress field; no-op when the task isn't running or doesn't exist.

#### Parameters

##### id

`string`

##### progress

`unknown`

#### Returns

`void`
