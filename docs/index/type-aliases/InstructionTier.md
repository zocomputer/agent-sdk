[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / InstructionTier

# Type Alias: InstructionTier

> **InstructionTier** = `"full"` \| `"compact"`

Defined in: [packages/agent-sdk/src/prompt-sections.ts:22](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/prompt-sections.ts#L22)

Depth variant for the instruction prose. `"full"` is the default — every
rule with its rationale and examples. `"compact"` keeps every load-bearing
rule and tool name but strips elaboration to roughly a third of the size,
for small/code-tuned models where a long behavioral prompt crowds the
context (codex ships a ~3× smaller prompt for its code-tuned family the
same way). Both variants of a section are authored side by side in one
builder, so they can't drift apart the way forked prompt files do. Pick the
tier once per session — it interpolates at build time, so the prompt prefix
stays byte-stable (prompt-cache safe).
