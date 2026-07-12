[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / INSTRUCTION\_STACK\_SECTION\_IDS

# Variable: INSTRUCTION\_STACK\_SECTION\_IDS

> `const` **INSTRUCTION\_STACK\_SECTION\_IDS**: readonly \[`"repo-conventions"`, `"workflow"`, `"planning"`, `"parallel-tools"`, `"subagents"`, `"media"`, `"hitl"`, `"communication"`\]

Defined in: [packages/agent-sdk/src/instructions.ts:664](https://github.com/zocomputer/zov2-code/blob/13e58351dfe3adc12c256d37f6058b3b4e0032bd/packages/agent-sdk/src/instructions.ts#L664)

The SDK's canonical section order — environment first (repo conventions),
then the core loop (workflow, planning), tool playbooks (parallel tools,
subagents, media), and the user-facing contracts last (asking, reporting).
These ids are the anchors for [PlacedPromptSection](../interfaces/PlacedPromptSection.md) placement and the
keys for omission. `media` appears only when an oracle is configured;
`repo-conventions` only when a local `workspaceRoot` is given.
