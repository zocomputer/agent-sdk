[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / DEFAULT\_JUDGE\_TIMEOUT\_MS

# Variable: DEFAULT\_JUDGE\_TIMEOUT\_MS

> `const` **DEFAULT\_JUDGE\_TIMEOUT\_MS**: `60000` = `60_000`

Defined in: [packages/agent-sdk/src/validated-compaction.ts:66](https://github.com/zocomputer/zov2-code/blob/d124383bcfcf0ca6d96b92bff96fa6dfccc07562/packages/agent-sdk/src/validated-compaction.ts#L66)

Default judge-call timeout in milliseconds. Compaction already costs one
model call; the judge call is the "slight delay" the validation trades for
summary quality, and past this budget the facade fails open instead of
holding the turn.
