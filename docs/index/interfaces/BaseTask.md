[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / BaseTask

# Interface: BaseTask

Defined in: [packages/agent-sdk/src/async-tasks.ts:32](https://github.com/zocomputer/zov2-code/blob/ad31c397882c72b933077cb2108bebb0430d6e9d/packages/agent-sdk/src/async-tasks.ts#L32)

Fields every task carries regardless of status — see `Task`.

## Properties

### id

> `readonly` **id**: `string`

Defined in: [packages/agent-sdk/src/async-tasks.ts:33](https://github.com/zocomputer/zov2-code/blob/ad31c397882c72b933077cb2108bebb0430d6e9d/packages/agent-sdk/src/async-tasks.ts#L33)

***

### label

> `readonly` **label**: `string`

Defined in: [packages/agent-sdk/src/async-tasks.ts:35](https://github.com/zocomputer/zov2-code/blob/ad31c397882c72b933077cb2108bebb0430d6e9d/packages/agent-sdk/src/async-tasks.ts#L35)

Short human label, e.g. the command or query.

***

### progress?

> `readonly` `optional` **progress?**: `unknown`

Defined in: [packages/agent-sdk/src/async-tasks.ts:39](https://github.com/zocomputer/zov2-code/blob/ad31c397882c72b933077cb2108bebb0430d6e9d/packages/agent-sdk/src/async-tasks.ts#L39)

***

### startedAt

> `readonly` **startedAt**: `number`

Defined in: [packages/agent-sdk/src/async-tasks.ts:38](https://github.com/zocomputer/zov2-code/blob/ad31c397882c72b933077cb2108bebb0430d6e9d/packages/agent-sdk/src/async-tasks.ts#L38)

***

### tool

> `readonly` **tool**: `string`

Defined in: [packages/agent-sdk/src/async-tasks.ts:37](https://github.com/zocomputer/zov2-code/blob/ad31c397882c72b933077cb2108bebb0430d6e9d/packages/agent-sdk/src/async-tasks.ts#L37)

Which backgroundable op produced this task.
