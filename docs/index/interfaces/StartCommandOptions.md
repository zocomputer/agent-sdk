[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / StartCommandOptions

# Interface: StartCommandOptions

Defined in: [packages/agent-sdk/src/run.ts:52](https://github.com/zocomputer/zov2-code/blob/58f42fa9905e1eaf108a953f694006c436ab7598/packages/agent-sdk/src/run.ts#L52)

Options for starting a shell command: working directory, timeout, and an
optional raw-output tap called with every chunk before truncation.

## Properties

### cwd?

> `optional` **cwd?**: `string`

Defined in: [packages/agent-sdk/src/run.ts:53](https://github.com/zocomputer/zov2-code/blob/58f42fa9905e1eaf108a953f694006c436ab7598/packages/agent-sdk/src/run.ts#L53)

***

### onOutput?

> `optional` **onOutput?**: (`chunk`) => `void`

Defined in: [packages/agent-sdk/src/run.ts:59](https://github.com/zocomputer/zov2-code/blob/58f42fa9905e1eaf108a953f694006c436ab7598/packages/agent-sdk/src/run.ts#L59)

Raw output tap, called with every stdout/stderr chunk as it arrives
(before any preview truncation). Powers background-output watchers.

#### Parameters

##### chunk

`string`

#### Returns

`void`

***

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [packages/agent-sdk/src/run.ts:54](https://github.com/zocomputer/zov2-code/blob/58f42fa9905e1eaf108a953f694006c436ab7598/packages/agent-sdk/src/run.ts#L54)
