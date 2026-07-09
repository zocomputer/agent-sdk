[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createParallelToolsInstruction

# Function: createParallelToolsInstruction()

> **createParallelToolsInstruction**(`opts?`): `DynamicSentinel`

Defined in: [packages/agent-sdk/src/instructions.ts:273](https://github.com/zocomputer/zov2-code/blob/7513818a294edcc3dc2a057e2719d829477c04ad/packages/agent-sdk/src/instructions.ts#L273)

The workflow guidance for the stdlib's async tools (bash auto-backgrounding,
run_async/check_tasks/await_task). Static by design: dynamic instructions
are system messages — part of the cached prompt prefix — so live task state
belongs in tool results (check_tasks), never re-rendered here.

## Parameters

### opts?

#### tier?

[`InstructionTier`](../type-aliases/InstructionTier.md)

## Returns

`DynamicSentinel`
