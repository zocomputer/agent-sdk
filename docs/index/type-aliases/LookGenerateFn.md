[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / LookGenerateFn

# Type Alias: LookGenerateFn

> **LookGenerateFn** = (`options`) => `Promise`\<\{ `text`: `string`; \}\>

Defined in: [packages/agent-sdk/src/tools/look.ts:121](https://github.com/zocomputer/zov2-code/blob/3530b39a94e929be74c3d9202bace84f47b21b44/packages/agent-sdk/src/tools/look.ts#L121)

The one generate call `look` makes, as an injectable seam (tests pass a
fake; the default is `ai`'s `generateText`). Only the fields the tool
actually sets.

## Parameters

### options

#### abortSignal?

`AbortSignal`

Cancels the oracle call when the owning turn is stopped.

#### headers?

`Record`\<`string`, `string`\>

#### messages

`ModelMessage`[]

#### model

`LanguageModel`

#### timeoutMs

`number`

Total timeout for the call, ms (the AI SDK's `timeout` setting).

## Returns

`Promise`\<\{ `text`: `string`; \}\>
