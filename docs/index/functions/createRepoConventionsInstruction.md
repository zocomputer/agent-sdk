[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createRepoConventionsInstruction

# Function: createRepoConventionsInstruction()

> **createRepoConventionsInstruction**(`opts`): `DynamicSentinel`\<\{ `markdown`: `string`; \}\>

Defined in: [packages/agent-sdk/src/instructions.ts:83](https://github.com/zocomputer/zov2-code/blob/760605b8ac267b8d97156760bb2d6e6d1b69ada8/packages/agent-sdk/src/instructions.ts#L83)

Inject the workspace's root AGENTS.md as a system-prompt section. Nested
per-directory AGENTS.md files stay the model's job to read — this covers
the root conventions.

## Parameters

### opts

#### workspaceRoot

`string`

## Returns

`DynamicSentinel`\<\{ `markdown`: `string`; \}\>
