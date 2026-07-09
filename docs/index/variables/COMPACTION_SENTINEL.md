[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / COMPACTION\_SENTINEL

# Variable: COMPACTION\_SENTINEL

> `const` **COMPACTION\_SENTINEL**: `"You are a conversation summarizer."` = `"You are a conversation summarizer."`

Defined in: [packages/agent-sdk/src/validated-compaction.ts:42](https://github.com/zocomputer/zov2-code/blob/edfd579427fbfafd3e21ca75b7f30a50695b254b/packages/agent-sdk/src/validated-compaction.ts#L42)

The opening sentence of eve's compaction system prompt, used to recognize a
compaction call on the wrapped model.

eve's `COMPACTION_SYSTEM_PROMPT` (dist `src/harness/compaction.js`) starts
with exactly this sentence; the pin test drives eve's real `compactMessages`
through the facade to keep this string honest against eve upgrades.
