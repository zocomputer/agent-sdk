[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createRepoConventionsInstruction

# Function: createRepoConventionsInstruction()

> **createRepoConventionsInstruction**(`opts`): `DynamicSentinel`

Defined in: [packages/agent-sdk/src/instructions.ts:39](https://github.com/zocomputer/zov2-code/blob/b4029c52fbf982f223af7621dd5db23545388982/packages/agent-sdk/src/instructions.ts#L39)

Inject the workspace's root AGENTS.md as a system-prompt section. Nested
per-directory AGENTS.md files stay the model's job to read — this covers
the root conventions.

## Parameters

### opts

#### workspaceRoot

`string`

## Returns

`DynamicSentinel`
