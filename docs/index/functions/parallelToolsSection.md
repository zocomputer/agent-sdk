[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / parallelToolsSection

# Function: parallelToolsSection()

> **parallelToolsSection**(`opts?`): [`PromptSection`](../interfaces/PromptSection.md)

Defined in: [packages/agent-sdk/src/instructions.ts:230](https://github.com/zocomputer/zov2-code/blob/58f42fa9905e1eaf108a953f694006c436ab7598/packages/agent-sdk/src/instructions.ts#L230)

The background-work section for the stdlib's async tools (bash
auto-backgrounding, run_async/check_tasks/await_task, notify watchers, the
prompt-cache-aware polling rule). Static by design: live task state belongs
in tool results (check_tasks), never re-rendered into the prompt. See
journal/team/harness-research/2026-07-01-prompt-cache-as-economic-constraint.md.

## Parameters

### opts?

#### tier?

[`InstructionTier`](../type-aliases/InstructionTier.md)

Prose depth; defaults to "full".

## Returns

[`PromptSection`](../interfaces/PromptSection.md)
