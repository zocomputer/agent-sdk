[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / BaseTask

# Interface: BaseTask

Defined in: [packages/agent-sdk/src/async-tasks.ts:70](https://github.com/zocomputer/zov2-code/blob/ff98edef5b507bf96c80f8f4c36882d827c8a81e/packages/agent-sdk/src/async-tasks.ts#L70)

Fields every task carries regardless of status — see `Task`.

## Properties

### id

> `readonly` **id**: `string` & `$brand`\<`"TaskId"`\>

Defined in: [packages/agent-sdk/src/async-tasks.ts:71](https://github.com/zocomputer/zov2-code/blob/ff98edef5b507bf96c80f8f4c36882d827c8a81e/packages/agent-sdk/src/async-tasks.ts#L71)

***

### label

> `readonly` **label**: `string`

Defined in: [packages/agent-sdk/src/async-tasks.ts:73](https://github.com/zocomputer/zov2-code/blob/ff98edef5b507bf96c80f8f4c36882d827c8a81e/packages/agent-sdk/src/async-tasks.ts#L73)

Short human label, e.g. the command or query.

***

### progress?

> `readonly` `optional` **progress?**: `unknown`

Defined in: [packages/agent-sdk/src/async-tasks.ts:79](https://github.com/zocomputer/zov2-code/blob/ff98edef5b507bf96c80f8f4c36882d827c8a81e/packages/agent-sdk/src/async-tasks.ts#L79)

***

### scope

> `readonly` **scope**: [`TaskScope`](TaskScope.md)

Defined in: [packages/agent-sdk/src/async-tasks.ts:77](https://github.com/zocomputer/zov2-code/blob/ff98edef5b507bf96c80f8f4c36882d827c8a81e/packages/agent-sdk/src/async-tasks.ts#L77)

Session authorization that owns this task and every read of it.

***

### startedAt

> `readonly` **startedAt**: `number`

Defined in: [packages/agent-sdk/src/async-tasks.ts:78](https://github.com/zocomputer/zov2-code/blob/ff98edef5b507bf96c80f8f4c36882d827c8a81e/packages/agent-sdk/src/async-tasks.ts#L78)

***

### tool

> `readonly` **tool**: `string`

Defined in: [packages/agent-sdk/src/async-tasks.ts:75](https://github.com/zocomputer/zov2-code/blob/ff98edef5b507bf96c80f8f4c36882d827c8a81e/packages/agent-sdk/src/async-tasks.ts#L75)

Which backgroundable op produced this task.
