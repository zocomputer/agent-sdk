[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createWorkflowInstruction

# Function: createWorkflowInstruction()

> **createWorkflowInstruction**(`opts?`): `DynamicSentinel`

Defined in: [packages/agent-sdk/src/instructions.ts:106](https://github.com/zocomputer/zov2-code/blob/b4029c52fbf982f223af7621dd5db23545388982/packages/agent-sdk/src/instructions.ts#L106)

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
