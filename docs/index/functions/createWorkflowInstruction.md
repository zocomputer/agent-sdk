[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createWorkflowInstruction

# Function: createWorkflowInstruction()

> **createWorkflowInstruction**(`opts?`): `DynamicSentinel`

Defined in: [packages/agent-sdk/src/instructions.ts:102](https://github.com/zocomputer/zov2-code/blob/ce93d09ec2812425a1522360ec5d53274fce9d8d/packages/agent-sdk/src/instructions.ts#L102)

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
