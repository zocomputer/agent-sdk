[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createPlanningInstruction

# Function: createPlanningInstruction()

> **createPlanningInstruction**(`opts?`): `DynamicSentinel`\<\{ `markdown`: `string`; \}\>

Defined in: [packages/agent-sdk/src/instructions.ts:208](https://github.com/zocomputer/zov2-code/blob/48650141bb7b851495928e6463ae438988b79a49/packages/agent-sdk/src/instructions.ts#L208)

The planning playbook for eve's built-in `todo` tool: when to plan, step
quality, and status discipline. Static and session-stable (prompt-cache
safe).

## Parameters

### opts?

#### tier?

[`InstructionTier`](../type-aliases/InstructionTier.md)

## Returns

`DynamicSentinel`\<\{ `markdown`: `string`; \}\>
