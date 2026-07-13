[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [validated-compaction](../README.md) / DEFAULT\_JUDGE\_TIMEOUT\_MS

# Variable: DEFAULT\_JUDGE\_TIMEOUT\_MS

> `const` **DEFAULT\_JUDGE\_TIMEOUT\_MS**: `60000` = `60_000`

Defined in: [packages/runtime-ai/src/validated-compaction.ts:70](https://github.com/zocomputer/zov2-code/blob/fc4b6dd8dd680b4495b1f44b776f9a8d76104d40/packages/runtime-ai/src/validated-compaction.ts#L70)

Default judge-call timeout in milliseconds. Compaction already costs one
model call; the judge call is the "slight delay" the validation trades for
summary quality, and past this budget the facade fails open instead of
holding the turn.
