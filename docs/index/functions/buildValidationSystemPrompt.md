[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / buildValidationSystemPrompt

# Function: buildValidationSystemPrompt()

> **buildValidationSystemPrompt**(`maxFacts`): `string`

Defined in: [packages/agent-sdk/src/validated-compaction.ts:142](https://github.com/zocomputer/zov2-code/blob/58f42fa9905e1eaf108a953f694006c436ab7598/packages/agent-sdk/src/validated-compaction.ts#L142)

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
