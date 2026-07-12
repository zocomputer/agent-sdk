[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createParallelToolsInstruction

# Function: createParallelToolsInstruction()

> **createParallelToolsInstruction**(`opts?`): `DynamicSentinel`

Defined in: [packages/agent-sdk/src/instructions.ts:294](https://github.com/zocomputer/zov2-code/blob/13e58351dfe3adc12c256d37f6058b3b4e0032bd/packages/agent-sdk/src/instructions.ts#L294)

The workflow guidance for the stdlib's async tools (bash auto-backgrounding,
run_async/check_tasks/await_task). Static by design: dynamic instructions
are system messages — part of the cached prompt prefix — so live task state
belongs in tool results (check_tasks), never re-rendered here.

## Parameters

### opts?

#### notifications?

`boolean`

Whether the async tools advertise `notify` watchers; see parallelToolsSection.

#### tier?

[`InstructionTier`](../type-aliases/InstructionTier.md)

## Returns

`DynamicSentinel`
