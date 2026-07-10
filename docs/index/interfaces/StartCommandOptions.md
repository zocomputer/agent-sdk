[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / StartCommandOptions

# Interface: StartCommandOptions

Defined in: [packages/agent-sdk/src/run.ts:53](https://github.com/zocomputer/zov2-code/blob/ef70d86dc0c3cdb95eb7c208e5ea40a4edf9effb/packages/agent-sdk/src/run.ts#L53)

Options for starting a shell command: working directory, timeout, and an
optional raw-output tap called with every chunk before truncation.

## Properties

### cwd?

> `optional` **cwd?**: `string`

Defined in: [packages/agent-sdk/src/run.ts:54](https://github.com/zocomputer/zov2-code/blob/ef70d86dc0c3cdb95eb7c208e5ea40a4edf9effb/packages/agent-sdk/src/run.ts#L54)

***

### onOutput?

> `optional` **onOutput?**: (`chunk`) => `void`

Defined in: [packages/agent-sdk/src/run.ts:60](https://github.com/zocomputer/zov2-code/blob/ef70d86dc0c3cdb95eb7c208e5ea40a4edf9effb/packages/agent-sdk/src/run.ts#L60)

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

Defined in: [packages/agent-sdk/src/run.ts:55](https://github.com/zocomputer/zov2-code/blob/ef70d86dc0c3cdb95eb7c208e5ea40a4edf9effb/packages/agent-sdk/src/run.ts#L55)
