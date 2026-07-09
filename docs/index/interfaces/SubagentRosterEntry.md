[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SubagentRosterEntry

# Interface: SubagentRosterEntry

Defined in: [packages/agent-sdk/src/instructions.ts:475](https://github.com/zocomputer/zov2-code/blob/58f42fa9905e1eaf108a953f694006c436ab7598/packages/agent-sdk/src/instructions.ts#L475)

One declared subagent the delegation playbook should route work to.

## Properties

### name

> `readonly` **name**: `string`

Defined in: [packages/agent-sdk/src/instructions.ts:477](https://github.com/zocomputer/zov2-code/blob/58f42fa9905e1eaf108a953f694006c436ab7598/packages/agent-sdk/src/instructions.ts#L477)

The subagent's tool name (its `agent/subagents/<id>/` directory name).

***

### when

> `readonly` **when**: `string`

Defined in: [packages/agent-sdk/src/instructions.ts:479](https://github.com/zocomputer/zov2-code/blob/58f42fa9905e1eaf108a953f694006c436ab7598/packages/agent-sdk/src/instructions.ts#L479)

When the parent should pick it, e.g. "read-only codebase questions".
