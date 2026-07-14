[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [testing](../README.md) / MOCK\_SCENARIOS

# Variable: MOCK\_SCENARIOS

> `const` **MOCK\_SCENARIOS**: readonly \[`"hitl"`, `"parallel"`, `"todo"`, `"delegate"`, `"fail"`, `"burst"`, `"markdown"`, `"interleave"`, `"empty"`, `"recall"`\]

Defined in: [packages/agent-sdk/src/mock-model.ts:94](https://github.com/zocomputer/zov2-code/blob/2480a6ef0f68d759f57bf84a8fcb14c879dd765d/packages/agent-sdk/src/mock-model.ts#L94)

Every recognized `[mock:<scenario>]` directive: multi-step tool scripts
(`hitl`, `parallel`, `todo`, `delegate`) plus special stream shapes
(`fail` ends in a terminal error, `burst` streams with no pacing,
`markdown` splits structure across deltas, `interleave` alternates
reasoning and text blocks, `empty` finishes with zero content parts,
`recall` echoes the prompt's recovered-context section — see
`recallReply` in this module).
