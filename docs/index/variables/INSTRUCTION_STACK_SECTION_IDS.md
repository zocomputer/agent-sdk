[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / INSTRUCTION\_STACK\_SECTION\_IDS

# Variable: INSTRUCTION\_STACK\_SECTION\_IDS

> `const` **INSTRUCTION\_STACK\_SECTION\_IDS**: readonly \[`"repo-conventions"`, `"workflow"`, `"planning"`, `"parallel-tools"`, `"subagents"`, `"media"`, `"hitl"`, `"communication"`\]

Defined in: [packages/agent-sdk/src/instructions.ts:578](https://github.com/zocomputer/zov2-code/blob/8718aaa2765d9af21ff0cbb162dec35286dbcb11/packages/agent-sdk/src/instructions.ts#L578)

The SDK's canonical section order — environment first (repo conventions),
then the core loop (workflow, planning), tool playbooks (parallel tools,
subagents, media), and the user-facing contracts last (asking, reporting).
These ids are the anchors for [PlacedPromptSection](../interfaces/PlacedPromptSection.md) placement and the
keys for omission. `media` appears only when an oracle is configured.
