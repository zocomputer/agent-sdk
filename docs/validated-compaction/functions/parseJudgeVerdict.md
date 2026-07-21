[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [validated-compaction](../README.md) / parseJudgeVerdict

# Function: parseJudgeVerdict()

> **parseJudgeVerdict**(`text`): \{ `kind`: `"nothing-missing"`; \} \| \{ `facts`: readonly `string`[]; `kind`: `"missing"`; \}

Defined in: [packages/runtime-ai/src/validated-compaction.ts:166](https://github.com/zocomputer/zov2-code/blob/431612973a5c06efcad7920699932d7fe7145ddd/packages/runtime-ai/src/validated-compaction.ts#L166)

Parse a judge reply into a verdict. Total — any string parses: a trimmed
`NOTHING MISSING` (case-insensitive, optional trailing punctuation) or a
reply containing no `- `/`* ` bullet lines is nothing-missing; otherwise the
bullet lines are the missing facts, in reply order, uncapped (the facade
applies `maxRecoveredFacts`).

## Parameters

### text

`string`

## Returns

\{ `kind`: `"nothing-missing"`; \} \| \{ `facts`: readonly `string`[]; `kind`: `"missing"`; \}
