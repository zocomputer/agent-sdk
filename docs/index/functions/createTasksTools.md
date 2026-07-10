[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createTasksTools

# Function: createTasksTools()

> **createTasksTools**(`opts`): `DynamicSentinel`

Defined in: [packages/agent-sdk/src/tools/tasks.ts:277](https://github.com/zocomputer/zov2-code/blob/2ecdaafb938b2184f882642908beb7b52901cb28/packages/agent-sdk/src/tools/tasks.ts#L277)

The toolset as one dynamic definition. Session-scoped on purpose: tool
definitions sit in the model's cached prompt prefix, so the run_async
catalog is built once per session and stays byte-identical thereafter —
live task state rides check_tasks' RESULT, never a description.

## Parameters

### opts

#### backgroundables

readonly [`BackgroundableOp`](../interfaces/BackgroundableOp.md)[]

#### notifications?

`boolean`

Advertise + wire notify watchers (default true); see buildTasksToolset.

#### registry

[`TaskRegistry`](../interfaces/TaskRegistry.md)

#### steerInbox?

[`SteerSource`](../type-aliases/SteerSource.md) \| `null`

When set, steered messages ride these tools' results (see ../steer-tool).

## Returns

`DynamicSentinel`
