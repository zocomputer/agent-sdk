[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / OpStartExtras

# Interface: OpStartExtras

Defined in: [packages/agent-sdk/src/backgroundable.ts:13](https://github.com/zocomputer/zov2-code/blob/311b5755d0a50f315302987e21c3a97a752a3696/packages/agent-sdk/src/backgroundable.ts#L13)

Optional live handles run_async threads into an op (e.g. a watcher tap).

## Properties

### ctx?

> `optional` **ctx?**: [`IoToolContext`](IoToolContext.md)

Defined in: [packages/agent-sdk/src/backgroundable.ts:21](https://github.com/zocomputer/zov2-code/blob/311b5755d0a50f315302987e21c3a97a752a3696/packages/agent-sdk/src/backgroundable.ts#L21)

The calling tool's context, for ops whose backend resolves per call
(the sandbox command runner reads `ctx.getSandbox()`). Ops with a fixed
backend ignore it.

***

### onOutput?

> `optional` **onOutput?**: (`chunk`) => `void`

Defined in: [packages/agent-sdk/src/backgroundable.ts:15](https://github.com/zocomputer/zov2-code/blob/311b5755d0a50f315302987e21c3a97a752a3696/packages/agent-sdk/src/backgroundable.ts#L15)

Raw output tap; an op that produces no stream just ignores it.

#### Parameters

##### chunk

`string`

#### Returns

`void`
