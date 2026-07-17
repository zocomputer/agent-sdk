[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / INSTRUCTION\_STACK\_SECTION\_IDS

# Variable: INSTRUCTION\_STACK\_SECTION\_IDS

> `const` **INSTRUCTION\_STACK\_SECTION\_IDS**: readonly \[`"repo-conventions"`, `"workflow"`, `"planning"`, `"parallel-tools"`, `"subagents"`, `"media"`, `"hitl"`, `"communication"`\]

Defined in: [packages/agent-sdk/src/instructions.ts:708](https://github.com/zocomputer/zov2-code/blob/178825142421d42c04f57b0afbc80612a16fe4c6/packages/agent-sdk/src/instructions.ts#L708)

The SDK's canonical section order — environment first (repo conventions),
then the core loop (workflow, planning), tool playbooks (parallel tools,
subagents, media), and the user-facing contracts last (asking, reporting).
These ids are the anchors for [PlacedPromptSection](../interfaces/PlacedPromptSection.md) placement and the
keys for omission. `media` appears only when an oracle is configured;
`repo-conventions` only when a local `workspaceRoot` is given.
