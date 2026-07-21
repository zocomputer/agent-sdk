[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [validated-compaction](../README.md) / buildRecoverySection

# Function: buildRecoverySection()

> **buildRecoverySection**(`facts`, `maxChars`): \{ `kept`: `number`; `text`: `string`; `truncated`: `boolean`; \} \| `null`

Defined in: [packages/runtime-ai/src/validated-compaction.ts:190](https://github.com/zocomputer/zov2-code/blob/bc82d445ad6dedff4ca3f700330838d6a3441bf7/packages/runtime-ai/src/validated-compaction.ts#L190)

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
