[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createSubagentInstruction

# Function: createSubagentInstruction()

> **createSubagentInstruction**(`opts?`): `DynamicSentinel`

Defined in: [packages/agent-sdk/src/instructions.ts:211](https://github.com/zocomputer/zov2-code/blob/e58b3bae5fbd35c5f457130033750c9c33ee334c/packages/agent-sdk/src/instructions.ts#L211)

Delegation guidance for eve's built-in `agent` tool (a clone of the calling
agent) and, when `roster` names declared subagents, the routing guidance
between them. eve ships the tools but no playbook, and models under-use
them or pack children with too little context without one. Static markdown,
session-stable (prompt-cache safe), parameterized only at build time.

## Parameters

### opts?

#### roster?

readonly [`SubagentRosterEntry`](../interfaces/SubagentRosterEntry.md)[]

#### workspaceNoun?

`string`

## Returns

`DynamicSentinel`
