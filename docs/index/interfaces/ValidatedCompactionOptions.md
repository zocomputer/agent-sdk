[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / ValidatedCompactionOptions

# Interface: ValidatedCompactionOptions

Defined in: [packages/agent-sdk/src/validated-compaction.ts:95](https://github.com/zocomputer/zov2-code/blob/edfd579427fbfafd3e21ca75b7f30a50695b254b/packages/agent-sdk/src/validated-compaction.ts#L95)

Options for [withValidatedCompaction](../functions/withValidatedCompaction.md).

## Properties

### judgeMaxOutputTokens?

> `optional` **judgeMaxOutputTokens?**: `number`

Defined in: [packages/agent-sdk/src/validated-compaction.ts:120](https://github.com/zocomputer/zov2-code/blob/edfd579427fbfafd3e21ca75b7f30a50695b254b/packages/agent-sdk/src/validated-compaction.ts#L120)

`maxOutputTokens` for the judge call. Defaults to
[DEFAULT\_JUDGE\_MAX\_OUTPUT\_TOKENS](../variables/DEFAULT_JUDGE_MAX_OUTPUT_TOKENS.md).

***

### judgeTimeoutMs?

> `optional` **judgeTimeoutMs?**: `number`

Defined in: [packages/agent-sdk/src/validated-compaction.ts:125](https://github.com/zocomputer/zov2-code/blob/edfd579427fbfafd3e21ca75b7f30a50695b254b/packages/agent-sdk/src/validated-compaction.ts#L125)

Judge-call timeout in milliseconds; on expiry the facade fails open.
Defaults to [DEFAULT\_JUDGE\_TIMEOUT\_MS](../variables/DEFAULT_JUDGE_TIMEOUT_MS.md).

***

### maxRecoveredChars?

> `optional` **maxRecoveredChars?**: `number`

Defined in: [packages/agent-sdk/src/validated-compaction.ts:109](https://github.com/zocomputer/zov2-code/blob/edfd579427fbfafd3e21ca75b7f30a50695b254b/packages/agent-sdk/src/validated-compaction.ts#L109)

Cap on the appended recovery section, in characters. Facts are kept
whole — the last one that would cross the cap is dropped, not clipped.
Defaults to [DEFAULT\_MAX\_RECOVERED\_CHARS](../variables/DEFAULT_MAX_RECOVERED_CHARS.md).

***

### maxRecoveredFacts?

> `optional` **maxRecoveredFacts?**: `number`

Defined in: [packages/agent-sdk/src/validated-compaction.ts:115](https://github.com/zocomputer/zov2-code/blob/edfd579427fbfafd3e21ca75b7f30a50695b254b/packages/agent-sdk/src/validated-compaction.ts#L115)

Cap on how many judge-reported facts are considered (the judge is told to
order most-important-first). Defaults to
[DEFAULT\_MAX\_RECOVERED\_FACTS](../variables/DEFAULT_MAX_RECOVERED_FACTS.md).

***

### onValidation?

> `optional` **onValidation?**: (`report`) => `void`

Defined in: [packages/agent-sdk/src/validated-compaction.ts:131](https://github.com/zocomputer/zov2-code/blob/edfd579427fbfafd3e21ca75b7f30a50695b254b/packages/agent-sdk/src/validated-compaction.ts#L131)

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

Defined in: [packages/agent-sdk/src/validated-compaction.ts:103](https://github.com/zocomputer/zov2-code/blob/edfd579427fbfafd3e21ca75b7f30a50695b254b/packages/agent-sdk/src/validated-compaction.ts#L103)

The judge's system prompt. Defaults to
[buildValidationSystemPrompt](../functions/buildValidationSystemPrompt.md) over `maxRecoveredFacts`. Replace it to
tune what counts as a load-bearing fact for your agent — keep the reply
contract (`NOTHING MISSING`, or `- ` bullet lines) or
[parseJudgeVerdict](../functions/parseJudgeVerdict.md) will read every reply as nothing-missing.
