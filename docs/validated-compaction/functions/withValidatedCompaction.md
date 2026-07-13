[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [validated-compaction](../README.md) / withValidatedCompaction

# Function: withValidatedCompaction()

> **withValidatedCompaction**(`model`, `options?`): `LanguageModelV4`

Defined in: [packages/runtime-ai/src/validated-compaction.ts:247](https://github.com/zocomputer/zov2-code/blob/fc4b6dd8dd680b4495b1f44b776f9a8d76104d40/packages/runtime-ai/src/validated-compaction.ts#L247)

Wrap a model so eve's compaction summaries are judged against the transcript
they replace, and repaired in place when the judge finds dropped facts.

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
