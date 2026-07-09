[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SubagentRosterEntry

# Interface: SubagentRosterEntry

Defined in: [packages/agent-sdk/src/instructions.ts:221](https://github.com/zocomputer/zov2-code/blob/a259f6f3d345009ac90c86d9f10d9171b99736b9/packages/agent-sdk/src/instructions.ts#L221)

One declared subagent the delegation playbook should route work to.

## Properties

### name

> `readonly` **name**: `string`

Defined in: [packages/agent-sdk/src/instructions.ts:223](https://github.com/zocomputer/zov2-code/blob/a259f6f3d345009ac90c86d9f10d9171b99736b9/packages/agent-sdk/src/instructions.ts#L223)

The subagent's tool name (its `agent/subagents/<id>/` directory name).

***

### when

> `readonly` **when**: `string`

Defined in: [packages/agent-sdk/src/instructions.ts:225](https://github.com/zocomputer/zov2-code/blob/a259f6f3d345009ac90c86d9f10d9171b99736b9/packages/agent-sdk/src/instructions.ts#L225)

When the parent should pick it, e.g. "read-only codebase questions".
