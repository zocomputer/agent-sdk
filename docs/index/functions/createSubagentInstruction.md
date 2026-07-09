[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createSubagentInstruction

# Function: createSubagentInstruction()

> **createSubagentInstruction**(`opts?`): `DynamicSentinel`

Defined in: [packages/agent-sdk/src/instructions.ts:264](https://github.com/zocomputer/zov2-code/blob/a97705ed30ddbf8dde363ccc922ce6eb90aa90a3/packages/agent-sdk/src/instructions.ts#L264)

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
