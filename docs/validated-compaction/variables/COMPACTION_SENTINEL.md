[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [validated-compaction](../README.md) / COMPACTION\_SENTINEL

# Variable: COMPACTION\_SENTINEL

> `const` **COMPACTION\_SENTINEL**: `"You are a conversation summarizer."` = `"You are a conversation summarizer."`

Defined in: [packages/runtime-ai/src/validated-compaction.ts:46](https://github.com/zocomputer/zov2-code/blob/76a0c7e372069bfa29a1d30375fdc2f67f746411/packages/runtime-ai/src/validated-compaction.ts#L46)

The opening sentence of eve's compaction system prompt, used to recognize a
compaction call on the wrapped model.

eve's `COMPACTION_SYSTEM_PROMPT` (dist `src/harness/compaction.js`) starts
with exactly this sentence; agent-sdk's pin test drives eve's real
`compactMessages` through the facade to keep this string honest against eve
upgrades, and the sibling drift-pin test keeps this copy equal to it.
