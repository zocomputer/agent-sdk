[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createWorkflowInstruction

# Function: createWorkflowInstruction()

> **createWorkflowInstruction**(`opts?`): `DynamicSentinel`\<\{ `markdown`: `string`; \}\>

Defined in: [packages/agent-sdk/src/instructions.ts:148](https://github.com/zocomputer/zov2-code/blob/a2d5ceb2d9204a0eb63ca9530ef74679c3b52143/packages/agent-sdk/src/instructions.ts#L148)

The how-to-work contract: explore→read→edit→verify, reproduction-first bug
fixing, todo tracking, and the end-of-turn completeness check. Static
markdown, session-stable (prompt-cache safe); the verify hint interpolates
once at build time.

## Parameters

### opts?

#### tier?

[`InstructionTier`](../type-aliases/InstructionTier.md)

#### verifyCommandHint?

`string`

#### workspaceNoun?

`string`

## Returns

`DynamicSentinel`\<\{ `markdown`: `string`; \}\>
