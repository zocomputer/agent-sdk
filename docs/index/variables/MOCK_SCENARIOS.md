[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / MOCK\_SCENARIOS

# Variable: MOCK\_SCENARIOS

> `const` **MOCK\_SCENARIOS**: readonly \[`"hitl"`, `"parallel"`, `"todo"`, `"delegate"`, `"fail"`, `"burst"`, `"markdown"`, `"interleave"`, `"empty"`\]

Defined in: [packages/agent-sdk/src/mock-model.ts:83](https://github.com/zocomputer/zov2-code/blob/7513818a294edcc3dc2a057e2719d829477c04ad/packages/agent-sdk/src/mock-model.ts#L83)

Every recognized `[mock:<scenario>]` directive: multi-step tool scripts
(`hitl`, `parallel`, `todo`, `delegate`) plus special stream shapes
(`fail` ends in a terminal error, `burst` streams with no pacing,
`markdown` splits structure across deltas, `interleave` alternates
reasoning and text blocks, `empty` finishes with zero content parts).
