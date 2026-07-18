[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / TaskRegistry

# Interface: TaskRegistry

Defined in: [packages/agent-sdk/src/async-tasks.ts:96](https://github.com/zocomputer/zov2-code/blob/3717bd4ab29bacfe3ae9a5e05df2947880cbf6c9/packages/agent-sdk/src/async-tasks.ts#L96)

Background task registry: spawn work and return an id immediately, list/get
task state, update progress, and await settlement with a timeout.

## Methods

### awaitTask()

> **awaitTask**(`scope`, `id`, `waitMs`, `abortSignal?`): `Promise`\<[`Task`](../type-aliases/Task.md) \| `undefined`\>

Defined in: [packages/agent-sdk/src/async-tasks.ts:113](https://github.com/zocomputer/zov2-code/blob/3717bd4ab29bacfe3ae9a5e05df2947880cbf6c9/packages/agent-sdk/src/async-tasks.ts#L113)

Block until the task settles or `waitMs` elapses, then return its current
state (still "running" if the wait timed out). Foreign and unknown ids
both return undefined.

#### Parameters

##### scope

[`TaskScope`](TaskScope.md)

##### id

`string` & `$brand`\<`"TaskId"`\>

##### waitMs

`number`

##### abortSignal?

`AbortSignal`

#### Returns

`Promise`\<[`Task`](../type-aliases/Task.md) \| `undefined`\>

***

### getTask()

> **getTask**(`scope`, `id`): [`Task`](../type-aliases/Task.md) \| `undefined`

Defined in: [packages/agent-sdk/src/async-tasks.ts:107](https://github.com/zocomputer/zov2-code/blob/3717bd4ab29bacfe3ae9a5e05df2947880cbf6c9/packages/agent-sdk/src/async-tasks.ts#L107)

Retrieve an owned task by id; undefined for foreign or unknown ids.

#### Parameters

##### scope

[`TaskScope`](TaskScope.md)

##### id

`string` & `$brand`\<`"TaskId"`\>

#### Returns

[`Task`](../type-aliases/Task.md) \| `undefined`

***

### listTasks()

> **listTasks**(`scope`): [`Task`](../type-aliases/Task.md)[]

Defined in: [packages/agent-sdk/src/async-tasks.ts:105](https://github.com/zocomputer/zov2-code/blob/3717bd4ab29bacfe3ae9a5e05df2947880cbf6c9/packages/agent-sdk/src/async-tasks.ts#L105)

List the calling session's tasks sorted by start time.

#### Parameters

##### scope

[`TaskScope`](TaskScope.md)

#### Returns

[`Task`](../type-aliases/Task.md)[]

***

### spawnTask()

> **spawnTask**(`scope`, `tool`, `label`, `work`): `string` & `$brand`\<`"TaskId"`\>

Defined in: [packages/agent-sdk/src/async-tasks.ts:98](https://github.com/zocomputer/zov2-code/blob/3717bd4ab29bacfe3ae9a5e05df2947880cbf6c9/packages/agent-sdk/src/async-tasks.ts#L98)

Register `work` as a background task and return its id immediately.

#### Parameters

##### scope

[`TaskScope`](TaskScope.md)

##### tool

`string`

##### label

`string`

##### work

`Promise`\<`unknown`\>

#### Returns

`string` & `$brand`\<`"TaskId"`\>

***

### updateTaskProgress()

> **updateTaskProgress**(`scope`, `id`, `progress`): `void`

Defined in: [packages/agent-sdk/src/async-tasks.ts:103](https://github.com/zocomputer/zov2-code/blob/3717bd4ab29bacfe3ae9a5e05df2947880cbf6c9/packages/agent-sdk/src/async-tasks.ts#L103)

Update an owned running task's progress field. Foreign, settled, and
unknown tasks are indistinguishable no-ops.

#### Parameters

##### scope

[`TaskScope`](TaskScope.md)

##### id

`string` & `$brand`\<`"TaskId"`\>

##### progress

`unknown`

#### Returns

`void`
