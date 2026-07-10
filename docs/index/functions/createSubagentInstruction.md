[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createSubagentInstruction

# Function: createSubagentInstruction()

> **createSubagentInstruction**(`opts?`): `DynamicSentinel`

Defined in: [packages/agent-sdk/src/instructions.ts:574](https://github.com/zocomputer/zov2-code/blob/ef70d86dc0c3cdb95eb7c208e5ea40a4edf9effb/packages/agent-sdk/src/instructions.ts#L574)

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

`DynamicSentinel`
