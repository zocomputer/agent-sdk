[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / CompactionValidationReport

# Type Alias: CompactionValidationReport

> **CompactionValidationReport** = \{ `judgeText`: `string`; `kind`: `"nothing-missing"`; \} \| \{ `appendedChars`: `number`; `facts`: readonly `string`[]; `kind`: `"repaired"`; `truncated`: `boolean`; \} \| \{ `error`: `unknown`; `kind`: `"judge-error"`; \} \| \{ `kind`: `"skipped"`; `reason`: `"no-transcript"` \| `"no-summary-text"`; \}

Defined in: [packages/agent-sdk/src/validated-compaction.ts:83](https://github.com/zocomputer/zov2-code/blob/0e648df1796b1446eeb67f62d6e2274440971464/packages/agent-sdk/src/validated-compaction.ts#L83)

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
