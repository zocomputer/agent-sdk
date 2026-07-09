[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createParallelToolsInstruction

# Function: createParallelToolsInstruction()

> **createParallelToolsInstruction**(): `DynamicSentinel`

Defined in: [packages/agent-sdk/src/instructions.ts:56](https://github.com/zocomputer/zov2-code/blob/a97705ed30ddbf8dde363ccc922ce6eb90aa90a3/packages/agent-sdk/src/instructions.ts#L56)

The workflow guidance for the stdlib's async tools (bash auto-backgrounding,
run_async/check_tasks/await_task). Static by design: dynamic instructions
are system messages — part of the cached prompt prefix — so live task state
belongs in tool results (check_tasks), never re-rendered here. See
journal/team/harness-research/2026-07-01-prompt-cache-as-economic-constraint.md.

## Returns

`DynamicSentinel`
