[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [validated-compaction](../README.md) / withValidatedCompactionProvider

# Function: withValidatedCompactionProvider()

> **withValidatedCompactionProvider**(`provider`, `options?`): `GatewayProvider`

Defined in: [packages/runtime-ai/src/validated-compaction.ts:384](https://github.com/zocomputer/zov2-code/blob/2f680aef81cf6a147ceac91fe4d066f3e4aff1b6/packages/runtime-ai/src/validated-compaction.ts#L384)

Lift [withValidatedCompaction](withValidatedCompaction.md) onto a gateway provider: every language
model it mints (`languageModel`, `chat`, or the callable form — `ai`'s
`resolveLanguageModel` goes through `languageModel` when it resolves a bare
string slug against the default-provider slot) comes back wrapped, and every
other member (embedding/image/speech models, `tools`, the metadata calls)
delegates untouched. A Proxy rather than a copied object so accessor
properties and future gateway members keep delegating.

## Parameters

### provider

`GatewayProvider`

### options?

[`ValidatedCompactionOptions`](../interfaces/ValidatedCompactionOptions.md) = `{}`

## Returns

`GatewayProvider`
