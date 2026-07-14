[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / BackgroundableOp

# Interface: BackgroundableOp

Defined in: [packages/agent-sdk/src/backgroundable.ts:30](https://github.com/zocomputer/zov2-code/blob/9538a0a8ac4443391049ca02b620175fec05d4cd/packages/agent-sdk/src/backgroundable.ts#L30)

A registered operation run_async can launch in the background: uniform
surface over any input type. `start` parses the raw tool input with the
op's own schema (throwing a clear error on bad input) and returns a label
plus the in-flight promise, with optional progress tap.

## Properties

### description

> `readonly` **description**: `string`

Defined in: [packages/agent-sdk/src/backgroundable.ts:32](https://github.com/zocomputer/zov2-code/blob/9538a0a8ac4443391049ca02b620175fec05d4cd/packages/agent-sdk/src/backgroundable.ts#L32)

***

### inputJsonSchema

> `readonly` **inputJsonSchema**: `unknown`

Defined in: [packages/agent-sdk/src/backgroundable.ts:34](https://github.com/zocomputer/zov2-code/blob/9538a0a8ac4443391049ca02b620175fec05d4cd/packages/agent-sdk/src/backgroundable.ts#L34)

JSON Schema of the op's input, surfaced so the model knows what to pass.

***

### name

> `readonly` **name**: `string`

Defined in: [packages/agent-sdk/src/backgroundable.ts:31](https://github.com/zocomputer/zov2-code/blob/9538a0a8ac4443391049ca02b620175fec05d4cd/packages/agent-sdk/src/backgroundable.ts#L31)

## Methods

### start()

> **start**(`rawInput`, `extras?`): `object`

Defined in: [packages/agent-sdk/src/backgroundable.ts:40](https://github.com/zocomputer/zov2-code/blob/9538a0a8ac4443391049ca02b620175fec05d4cd/packages/agent-sdk/src/backgroundable.ts#L40)

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
