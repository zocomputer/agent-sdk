[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [validated-compaction](../README.md) / ValidatedCompactionOptions

# Interface: ValidatedCompactionOptions

Defined in: [packages/runtime-ai/src/validated-compaction.ts:99](https://github.com/zocomputer/zov2-code/blob/3717bd4ab29bacfe3ae9a5e05df2947880cbf6c9/packages/runtime-ai/src/validated-compaction.ts#L99)

Options for [withValidatedCompaction](../functions/withValidatedCompaction.md).

## Properties

### judgeMaxOutputTokens?

> `optional` **judgeMaxOutputTokens?**: `number`

Defined in: [packages/runtime-ai/src/validated-compaction.ts:124](https://github.com/zocomputer/zov2-code/blob/3717bd4ab29bacfe3ae9a5e05df2947880cbf6c9/packages/runtime-ai/src/validated-compaction.ts#L124)

`maxOutputTokens` for the judge call. Defaults to
[DEFAULT\_JUDGE\_MAX\_OUTPUT\_TOKENS](../variables/DEFAULT_JUDGE_MAX_OUTPUT_TOKENS.md).

***

### judgeTimeoutMs?

> `optional` **judgeTimeoutMs?**: `number`

Defined in: [packages/runtime-ai/src/validated-compaction.ts:129](https://github.com/zocomputer/zov2-code/blob/3717bd4ab29bacfe3ae9a5e05df2947880cbf6c9/packages/runtime-ai/src/validated-compaction.ts#L129)

Judge-call timeout in milliseconds; on expiry the facade fails open.
Defaults to [DEFAULT\_JUDGE\_TIMEOUT\_MS](../variables/DEFAULT_JUDGE_TIMEOUT_MS.md).

***

### maxRecoveredChars?

> `optional` **maxRecoveredChars?**: `number`

Defined in: [packages/runtime-ai/src/validated-compaction.ts:113](https://github.com/zocomputer/zov2-code/blob/3717bd4ab29bacfe3ae9a5e05df2947880cbf6c9/packages/runtime-ai/src/validated-compaction.ts#L113)

Cap on the appended recovery section, in characters. Facts are kept
whole — the last one that would cross the cap is dropped, not clipped.
Defaults to [DEFAULT\_MAX\_RECOVERED\_CHARS](../variables/DEFAULT_MAX_RECOVERED_CHARS.md).

***

### maxRecoveredFacts?

> `optional` **maxRecoveredFacts?**: `number`

Defined in: [packages/runtime-ai/src/validated-compaction.ts:119](https://github.com/zocomputer/zov2-code/blob/3717bd4ab29bacfe3ae9a5e05df2947880cbf6c9/packages/runtime-ai/src/validated-compaction.ts#L119)

Cap on how many judge-reported facts are considered (the judge is told to
order most-important-first). Defaults to
[DEFAULT\_MAX\_RECOVERED\_FACTS](../variables/DEFAULT_MAX_RECOVERED_FACTS.md).

***

### onValidation?

> `optional` **onValidation?**: (`report`) => `void`

Defined in: [packages/runtime-ai/src/validated-compaction.ts:135](https://github.com/zocomputer/zov2-code/blob/3717bd4ab29bacfe3ae9a5e05df2947880cbf6c9/packages/runtime-ai/src/validated-compaction.ts#L135)

Observer for each validated compaction. Called once per intercepted
compaction call with the [CompactionValidationReport](../type-aliases/CompactionValidationReport.md); exceptions it
throws are swallowed (observability must not fail the compaction).

#### Parameters

##### report

[`CompactionValidationReport`](../type-aliases/CompactionValidationReport.md)

#### Returns

`void`

***

### validationSystemPrompt?

> `optional` **validationSystemPrompt?**: `string`

Defined in: [packages/runtime-ai/src/validated-compaction.ts:107](https://github.com/zocomputer/zov2-code/blob/3717bd4ab29bacfe3ae9a5e05df2947880cbf6c9/packages/runtime-ai/src/validated-compaction.ts#L107)

The judge's system prompt. Defaults to
[buildValidationSystemPrompt](../functions/buildValidationSystemPrompt.md) over `maxRecoveredFacts`. Replace it to
tune what counts as a load-bearing fact for your agent — keep the reply
contract (`NOTHING MISSING`, or `- ` bullet lines) or
[parseJudgeVerdict](../functions/parseJudgeVerdict.md) will read every reply as nothing-missing.
