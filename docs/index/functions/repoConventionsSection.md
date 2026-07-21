[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / repoConventionsSection

# Function: repoConventionsSection()

> **repoConventionsSection**(`opts`): [`PromptSection`](../interfaces/PromptSection.md)

Defined in: [packages/agent-sdk/src/instructions.ts:53](https://github.com/zocomputer/zov2-code/blob/fc65ac4f3ad029ed138ee11331693cba0bd295b4/packages/agent-sdk/src/instructions.ts#L53)

The root-AGENTS.md section: the workspace's root conventions file wrapped
in a `<root-agents-md>` block. Empty body (renders nothing) when the file
is absent. Tier-invariant — the content is the repo's, not the SDK's.

## Parameters

### opts

#### workspaceRoot

`string`

## Returns

[`PromptSection`](../interfaces/PromptSection.md)
