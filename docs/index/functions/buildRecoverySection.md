[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / buildRecoverySection

# Function: buildRecoverySection()

> **buildRecoverySection**(`facts`, `maxChars`): \{ `kept`: `number`; `text`: `string`; `truncated`: `boolean`; \} \| `null`

Defined in: [packages/agent-sdk/src/validated-compaction.ts:186](https://github.com/zocomputer/zov2-code/blob/86e2b5a89599cc09df999181d86a1667b22c1929/packages/agent-sdk/src/validated-compaction.ts#L186)

Render recovered facts as the section appended to a repaired summary: the
[RECOVERED\_CONTEXT\_HEADER](../variables/RECOVERED_CONTEXT_HEADER.md), an intro line, and one `- ` bullet per
fact. Facts are kept whole under `maxChars` — bullets are added in order
until the next would cross the cap. Returns `null` when not even the first
bullet fits (or `facts` is empty); `truncated` is true iff some facts were
dropped (`kept` below the fact count).

## Parameters

### facts

readonly `string`[]

### maxChars

`number`

## Returns

\{ `kept`: `number`; `text`: `string`; `truncated`: `boolean`; \} \| `null`
