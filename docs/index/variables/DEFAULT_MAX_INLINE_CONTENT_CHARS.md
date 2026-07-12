[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / DEFAULT\_MAX\_INLINE\_CONTENT\_CHARS

# Variable: DEFAULT\_MAX\_INLINE\_CONTENT\_CHARS

> `const` **DEFAULT\_MAX\_INLINE\_CONTENT\_CHARS**: `100000` = `100_000`

Defined in: [packages/agent-sdk/src/tools/webfetch.ts:148](https://github.com/zocomputer/zov2-code/blob/d124383bcfcf0ca6d96b92bff96fa6dfccc07562/packages/agent-sdk/src/tools/webfetch.ts#L148)

Default in-context character budget for the inline-first mode (no
`spillDir`): the whole rendered content returns inline up to this, then
head+tail truncation. ~25k tokens — markdownified pages are compact, so
most land far under it; the cap is the "extremely long" ceiling and a
context-cost knob (tool results enter the transcript permanently).
