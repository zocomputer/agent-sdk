[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / TASK\_DISABLED\_BUILTINS

# Variable: TASK\_DISABLED\_BUILTINS

> `const` **TASK\_DISABLED\_BUILTINS**: readonly \[`"ask_question"`\]

Defined in: [packages/agent-sdk/src/task.ts:38](https://github.com/zocomputer/zov2-code/blob/ff98edef5b507bf96c80f8f4c36882d827c8a81e/packages/agent-sdk/src/task.ts#L38)

Framework built-ins a task child vacates with a `disableTool()` shim — one
`tools/<name>.ts` per entry. Only `ask_question`: a parked child parks the
PARENT's turn, so a task worker that hits ambiguity makes the reasonable
call itself (or reports the blocker as its result) instead of asking the
user. Everything else follows the parent: parent-authored tools re-export;
builtins the parent didn't touch stay at their framework defaults in the
child too.

The `agent` clone tool is deliberately NOT here: eve injects it at the
harness layer, not as a framework tool, so a `disableTool()` shim for it
fails runtime agent-graph resolution — every session create 500s. The task
instruction bounds onward delegation instead.
