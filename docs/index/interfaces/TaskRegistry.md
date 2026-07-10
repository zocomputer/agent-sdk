[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / TaskRegistry

# Interface: TaskRegistry

Defined in: [packages/agent-sdk/src/async-tasks.ts:61](https://github.com/zocomputer/zov2-code/blob/b1083703742c40f0a33149c0d589f9948d72aea2/packages/agent-sdk/src/async-tasks.ts#L61)

Background task registry: spawn work and return an id immediately, list/get
task state, update progress, and await settlement with a timeout.

## Methods

### awaitTask()

> **awaitTask**(`id`, `waitMs`): `Promise`\<[`Task`](../type-aliases/Task.md) \| `undefined`\>

Defined in: [packages/agent-sdk/src/async-tasks.ts:80](https://github.com/zocomputer/zov2-code/blob/b1083703742c40f0a33149c0d589f9948d72aea2/packages/agent-sdk/src/async-tasks.ts#L80)

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

Defined in: [packages/agent-sdk/src/async-tasks.ts:75](https://github.com/zocomputer/zov2-code/blob/b1083703742c40f0a33149c0d589f9948d72aea2/packages/agent-sdk/src/async-tasks.ts#L75)

Retrieve one task by id; undefined when not found.

#### Parameters

##### id

`string`

#### Returns

[`Task`](../type-aliases/Task.md) \| `undefined`

***

### listTasks()

> **listTasks**(`sessionId?`): [`Task`](../type-aliases/Task.md)[]

Defined in: [packages/agent-sdk/src/async-tasks.ts:73](https://github.com/zocomputer/zov2-code/blob/b1083703742c40f0a33149c0d589f9948d72aea2/packages/agent-sdk/src/async-tasks.ts#L73)

List tasks sorted by start time. With `sessionId`, only that session's
tasks (plus session-less ones) — a shared warm instance must not leak
other sessions' command lines into check_tasks. Lookups by id
(`getTask`/`awaitTask`) stay unscoped: a task id is an unguessable
capability the model got from its own run_async.

#### Parameters

##### sessionId?

`string`

#### Returns

[`Task`](../type-aliases/Task.md)[]

***

### spawnTask()

> **spawnTask**(`tool`, `label`, `work`, `sessionId?`): `string`

Defined in: [packages/agent-sdk/src/async-tasks.ts:63](https://github.com/zocomputer/zov2-code/blob/b1083703742c40f0a33149c0d589f9948d72aea2/packages/agent-sdk/src/async-tasks.ts#L63)

Register `work` as a background task and return its id immediately.

#### Parameters

##### tool

`string`

##### label

`string`

##### work

`Promise`\<`unknown`\>

##### sessionId?

`string`

#### Returns

`string`

***

### updateTaskProgress()

> **updateTaskProgress**(`id`, `progress`): `void`

Defined in: [packages/agent-sdk/src/async-tasks.ts:65](https://github.com/zocomputer/zov2-code/blob/b1083703742c40f0a33149c0d589f9948d72aea2/packages/agent-sdk/src/async-tasks.ts#L65)

Update a running task's progress field; no-op when the task isn't running or doesn't exist.

#### Parameters

##### id

`string`

##### progress

`unknown`

#### Returns

`void`
