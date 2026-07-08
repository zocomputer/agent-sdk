[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createWorkflowInstruction

# Function: createWorkflowInstruction()

> **createWorkflowInstruction**(`opts?`): `DynamicSentinel`

Defined in: [packages/agent-sdk/src/instructions.ts:106](https://github.com/zocomputer/zov2-code/blob/aba140d6dd71d0ea05075bf6e9ebcc5739f7a7b3/packages/agent-sdk/src/instructions.ts#L106)

The how-to-work contract: explore→read→edit→verify, todo tracking, and the
end-of-turn completeness check. Static markdown, session-stable
(prompt-cache safe); the verify hint interpolates once at build time.

## Parameters

### opts?

#### verifyCommandHint?

`string`

#### workspaceNoun?

`string`

## Returns

`DynamicSentinel`
