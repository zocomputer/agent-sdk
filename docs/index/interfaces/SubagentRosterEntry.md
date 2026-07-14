[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SubagentRosterEntry

# Interface: SubagentRosterEntry

Defined in: [packages/agent-sdk/src/instructions.ts:483](https://github.com/zocomputer/zov2-code/blob/63d0e014c421616ce0383b99e59109da774eac14/packages/agent-sdk/src/instructions.ts#L483)

One declared subagent the delegation playbook should route work to.

## Properties

### name

> `readonly` **name**: `string`

Defined in: [packages/agent-sdk/src/instructions.ts:485](https://github.com/zocomputer/zov2-code/blob/63d0e014c421616ce0383b99e59109da774eac14/packages/agent-sdk/src/instructions.ts#L485)

The subagent's tool name (its `agent/subagents/<id>/` directory name).

***

### when

> `readonly` **when**: `string`

Defined in: [packages/agent-sdk/src/instructions.ts:487](https://github.com/zocomputer/zov2-code/blob/63d0e014c421616ce0383b99e59109da774eac14/packages/agent-sdk/src/instructions.ts#L487)

When the parent should pick it, e.g. "read-only codebase questions".
