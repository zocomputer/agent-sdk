[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createRepoConventionsInstruction

# Function: createRepoConventionsInstruction()

> **createRepoConventionsInstruction**(`opts`): `DynamicSentinel`

Defined in: [packages/agent-sdk/src/instructions.ts:83](https://github.com/zocomputer/zov2-code/blob/b1083703742c40f0a33149c0d589f9948d72aea2/packages/agent-sdk/src/instructions.ts#L83)

Inject the workspace's root AGENTS.md as a system-prompt section. Nested
per-directory AGENTS.md files stay the model's job to read — this covers
the root conventions.

## Parameters

### opts

#### workspaceRoot

`string`

## Returns

`DynamicSentinel`
