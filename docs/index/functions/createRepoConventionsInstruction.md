[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createRepoConventionsInstruction

# Function: createRepoConventionsInstruction()

> **createRepoConventionsInstruction**(`opts`): `DynamicSentinel`\<\{ `markdown`: `string`; \}\>

Defined in: [packages/agent-sdk/src/instructions.ts:83](https://github.com/zocomputer/zov2-code/blob/fc65ac4f3ad029ed138ee11331693cba0bd295b4/packages/agent-sdk/src/instructions.ts#L83)

Inject the workspace's root AGENTS.md as a system-prompt section. Nested
per-directory AGENTS.md files stay the model's job to read — this covers
the root conventions.

## Parameters

### opts

#### workspaceRoot

`string`

## Returns

`DynamicSentinel`\<\{ `markdown`: `string`; \}\>
