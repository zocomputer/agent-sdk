[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / defineOp

# Function: defineOp()

> **defineOp**\<`I`\>(`cfg`): [`BackgroundableOp`](../interfaces/BackgroundableOp.md)

Defined in: [packages/agent-sdk/src/backgroundable.ts:56](https://github.com/zocomputer/zov2-code/blob/9538a0a8ac4443391049ca02b620175fec05d4cd/packages/agent-sdk/src/backgroundable.ts#L56)

Define a backgroundable operation: typed input schema, label builder, and
the work function. The returned `BackgroundableOp` erases the input type
behind a uniform surface so the registry stays a plain array with no `any`.

## Type Parameters

### I

`I`

## Parameters

### cfg

#### description

`string`

#### inputSchema

`ZodType`\<`I`\>

#### label

(`input`) => `string`

#### name

`string`

#### run

(`input`, `extras?`) => `Promise`\<`unknown`\> \| \{ `progress?`: () => `unknown`; `work`: `Promise`\<`unknown`\>; \}

## Returns

[`BackgroundableOp`](../interfaces/BackgroundableOp.md)
