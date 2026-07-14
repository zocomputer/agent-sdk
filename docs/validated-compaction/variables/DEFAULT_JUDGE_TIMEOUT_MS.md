[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [validated-compaction](../README.md) / DEFAULT\_JUDGE\_TIMEOUT\_MS

# Variable: DEFAULT\_JUDGE\_TIMEOUT\_MS

> `const` **DEFAULT\_JUDGE\_TIMEOUT\_MS**: `60000` = `60_000`

Defined in: [packages/runtime-ai/src/validated-compaction.ts:70](https://github.com/zocomputer/zov2-code/blob/e7fb39c35601ce5ee40494fbfe469df1f7a9ecc4/packages/runtime-ai/src/validated-compaction.ts#L70)

Default judge-call timeout in milliseconds. Compaction already costs one
model call; the judge call is the "slight delay" the validation trades for
summary quality, and past this budget the facade fails open instead of
holding the turn.
