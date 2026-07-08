[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / OpStartExtras

# Interface: OpStartExtras

Defined in: [packages/agent-sdk/src/backgroundable.ts:12](https://github.com/zocomputer/zov2-code/blob/3f2b99c534a9f8d96ad85214e02d7c759a75762c/packages/agent-sdk/src/backgroundable.ts#L12)

Optional live handles run_async threads into an op (e.g. a watcher tap).

## Properties

### onOutput?

> `optional` **onOutput?**: (`chunk`) => `void`

Defined in: [packages/agent-sdk/src/backgroundable.ts:14](https://github.com/zocomputer/zov2-code/blob/3f2b99c534a9f8d96ad85214e02d7c759a75762c/packages/agent-sdk/src/backgroundable.ts#L14)

Raw output tap; an op that produces no stream just ignores it.

#### Parameters

##### chunk

`string`

#### Returns

`void`
