[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / defineOp

# Function: defineOp()

> **defineOp**\<`I`\>(`cfg`): [`BackgroundableOp`](../interfaces/BackgroundableOp.md)

Defined in: [packages/agent-sdk/src/backgroundable.ts:49](https://github.com/zocomputer/zov2-code/blob/58f42fa9905e1eaf108a953f694006c436ab7598/packages/agent-sdk/src/backgroundable.ts#L49)

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
