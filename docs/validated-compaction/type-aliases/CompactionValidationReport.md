[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [validated-compaction](../README.md) / CompactionValidationReport

# Type Alias: CompactionValidationReport

> **CompactionValidationReport** = \{ `judgeText`: `string`; `kind`: `"nothing-missing"`; \} \| \{ `appendedChars`: `number`; `facts`: readonly `string`[]; `kind`: `"repaired"`; `truncated`: `boolean`; \} \| \{ `error`: `unknown`; `kind`: `"judge-error"`; \} \| \{ `kind`: `"skipped"`; `reason`: `"no-transcript"` \| `"no-summary-text"`; \}

Defined in: [packages/runtime-ai/src/validated-compaction.ts:87](https://github.com/zocomputer/zov2-code/blob/af9677372192b613a9430e022ed9c3a186791633/packages/runtime-ai/src/validated-compaction.ts#L87)

What the validation did to one compaction call, delivered to
[ValidatedCompactionOptions.onValidation](../interfaces/ValidatedCompactionOptions.md#onvalidation).

- `nothing-missing` — the judge found no dropped facts (or reported facts
  that didn't fit even one bullet under `maxRecoveredChars`); the summary
  passed through unchanged. `judgeText` is the judge's raw reply.
- `repaired` — `facts` were appended as a [RECOVERED\_CONTEXT\_HEADER](../variables/RECOVERED_CONTEXT_HEADER.md)
  section (`appendedChars` characters including the separating blank line);
  `truncated` means the caps cut the judge's list short.
- `judge-error` — the judge call failed or timed out; the summary passed
  through unchanged (fail-open).
- `skipped` — the compaction call had no user-message transcript to audit
  against, or produced no summary text to audit.
