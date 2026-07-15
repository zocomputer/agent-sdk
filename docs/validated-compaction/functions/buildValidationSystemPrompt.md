[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [validated-compaction](../README.md) / buildValidationSystemPrompt

# Function: buildValidationSystemPrompt()

> **buildValidationSystemPrompt**(`maxFacts`): `string`

Defined in: [packages/runtime-ai/src/validated-compaction.ts:146](https://github.com/zocomputer/zov2-code/blob/492659e3281a9b9d11501446d7ec2e941b7da162/packages/runtime-ai/src/validated-compaction.ts#L146)

Build the default judge system prompt, telling the model to audit a summary
against its source transcript and reply `NOTHING MISSING` or at most
`maxFacts` `- ` bullet lines of concrete dropped facts. The fact taxonomy
(goals/status, modified files, decisions, constraints, pending verification,
exact identifiers) follows what the Slipstream paper (arXiv:2605.08580)
found compaction drops.

## Parameters

### maxFacts

`number`

## Returns

`string`
