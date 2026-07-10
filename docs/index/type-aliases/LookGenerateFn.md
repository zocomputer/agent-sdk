[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / LookGenerateFn

# Type Alias: LookGenerateFn

> **LookGenerateFn** = (`options`) => `Promise`\<\{ `text`: `string`; \}\>

Defined in: [packages/agent-sdk/src/tools/look.ts:121](https://github.com/zocomputer/zov2-code/blob/b7f06ca2cf0142cf87a67d683e96ae88d6c29abe/packages/agent-sdk/src/tools/look.ts#L121)

The one generate call `look` makes, as an injectable seam (tests pass a
fake; the default is `ai`'s `generateText`). Only the fields the tool
actually sets.

## Parameters

### options

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
