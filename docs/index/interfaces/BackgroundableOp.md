[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / BackgroundableOp

# Interface: BackgroundableOp

Defined in: [packages/agent-sdk/src/backgroundable.ts:23](https://github.com/zocomputer/zov2-code/blob/ea621634e36cbd869fece8585e35d7f842c47a15/packages/agent-sdk/src/backgroundable.ts#L23)

A registered operation run_async can launch in the background: uniform
surface over any input type. `start` parses the raw tool input with the
op's own schema (throwing a clear error on bad input) and returns a label
plus the in-flight promise, with optional progress tap.

## Properties

### description

> `readonly` **description**: `string`

Defined in: [packages/agent-sdk/src/backgroundable.ts:25](https://github.com/zocomputer/zov2-code/blob/ea621634e36cbd869fece8585e35d7f842c47a15/packages/agent-sdk/src/backgroundable.ts#L25)

***

### inputJsonSchema

> `readonly` **inputJsonSchema**: `unknown`

Defined in: [packages/agent-sdk/src/backgroundable.ts:27](https://github.com/zocomputer/zov2-code/blob/ea621634e36cbd869fece8585e35d7f842c47a15/packages/agent-sdk/src/backgroundable.ts#L27)

JSON Schema of the op's input, surfaced so the model knows what to pass.

***

### name

> `readonly` **name**: `string`

Defined in: [packages/agent-sdk/src/backgroundable.ts:24](https://github.com/zocomputer/zov2-code/blob/ea621634e36cbd869fece8585e35d7f842c47a15/packages/agent-sdk/src/backgroundable.ts#L24)

## Methods

### start()

> **start**(`rawInput`, `extras?`): `object`

Defined in: [packages/agent-sdk/src/backgroundable.ts:33](https://github.com/zocomputer/zov2-code/blob/ea621634e36cbd869fece8585e35d7f842c47a15/packages/agent-sdk/src/backgroundable.ts#L33)

Parse input and start the operation. Returns a user-facing label, the
in-flight work promise, and optionally a progress tap that reads the
op's current state (e.g. accumulated output, task count).

#### Parameters

##### rawInput

`unknown`

##### extras?

[`OpStartExtras`](OpStartExtras.md)

#### Returns

##### label

> **label**: `string`

##### progress?

> `optional` **progress?**: () => `unknown`

Optional tap that reads the op's current state (e.g. accumulated output, task count).

###### Returns

`unknown`

##### work

> **work**: `Promise`\<`unknown`\>
