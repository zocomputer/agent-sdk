[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / MOCK\_SCENARIOS

# Variable: MOCK\_SCENARIOS

> `const` **MOCK\_SCENARIOS**: readonly \[`"hitl"`, `"parallel"`, `"todo"`, `"delegate"`, `"fail"`, `"burst"`, `"markdown"`, `"interleave"`, `"empty"`, `"recall"`\]

Defined in: [packages/agent-sdk/src/mock-model.ts:94](https://github.com/zocomputer/zov2-code/blob/1fcc8b4b31cf28b6badb9d28c6512cd9261c730c/packages/agent-sdk/src/mock-model.ts#L94)

Every recognized `[mock:<scenario>]` directive: multi-step tool scripts
(`hitl`, `parallel`, `todo`, `delegate`) plus special stream shapes
(`fail` ends in a terminal error, `burst` streams with no pacing,
`markdown` splits structure across deltas, `interleave` alternates
reasoning and text blocks, `empty` finishes with zero content parts,
`recall` echoes the prompt's recovered-context section — see
`recallReply` in this module).
