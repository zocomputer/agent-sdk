[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createSubagentInstruction

# Function: createSubagentInstruction()

> **createSubagentInstruction**(`opts?`): `DynamicSentinel`\<\{ `markdown`: `string`; \}\>

Defined in: [packages/agent-sdk/src/instructions.ts:618](https://github.com/zocomputer/zov2-code/blob/bc82d445ad6dedff4ca3f700330838d6a3441bf7/packages/agent-sdk/src/instructions.ts#L618)

Delegation guidance for eve's built-in `agent` tool (a clone of the calling
agent) and, when `roster` names declared subagents, the routing guidance
between them. eve ships the tools but no playbook, and models under-use
them or pack children with too little context without one. Static markdown,
session-stable (prompt-cache safe), parameterized only at build time.

## Parameters

### opts?

#### roster?

readonly [`SubagentRosterEntry`](../interfaces/SubagentRosterEntry.md)[]

#### tier?

[`InstructionTier`](../type-aliases/InstructionTier.md)

#### workspaceNoun?

`string`

## Returns

`DynamicSentinel`\<\{ `markdown`: `string`; \}\>
