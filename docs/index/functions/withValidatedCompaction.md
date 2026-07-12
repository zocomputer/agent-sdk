[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / withValidatedCompaction

# Function: withValidatedCompaction()

> **withValidatedCompaction**(`model`, `options?`): `LanguageModelV4`

Defined in: [packages/agent-sdk/src/validated-compaction.ts:250](https://github.com/zocomputer/zov2-code/blob/3ac531f9ac263da198125b35b739171d97e53cac/packages/agent-sdk/src/validated-compaction.ts#L250)

Wrap a model so eve's compaction summaries are judged against the transcript
they replace, and repaired in place when the judge finds dropped facts.

Wire it on the TURN model an agent hands to `defineAgent` (see the module
doc for why authoring `compaction.model` doesn't work):

```ts
model: withValidatedCompaction(gateway("anthropic/claude-opus-4.8"))
```

Behavior per intercepted compaction call: run the base summary generation
unchanged, then ask the same model (one extra `doGenerate`, temperature 0)
whether the summary dropped load-bearing facts, and append the missing ones
as a [RECOVERED\_CONTEXT\_HEADER](../variables/RECOVERED_CONTEXT_HEADER.md) section. Fail-open throughout: judge
errors/timeouts and observer exceptions never fail the compaction, and base
summary errors propagate untouched. `doStream` (turn traffic) is a pure
delegate, and the facade mirrors `provider`/`modelId` so provider-string
gates (eve's Anthropic prompt-cache path detection) keep working.

## Parameters

### model

`LanguageModelV4`

### options?

[`ValidatedCompactionOptions`](../interfaces/ValidatedCompactionOptions.md) = `{}`

## Returns

`LanguageModelV4`
