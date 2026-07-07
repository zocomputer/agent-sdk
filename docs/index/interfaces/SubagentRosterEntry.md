[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SubagentRosterEntry

# Interface: SubagentRosterEntry

Defined in: [packages/agent-sdk/src/instructions.ts:168](https://github.com/zocomputer/zov2-code/blob/94be7c286c5c8961c9d40350c41cf663e8ab4554/packages/agent-sdk/src/instructions.ts#L168)

One declared subagent the delegation playbook should route work to.

## Properties

### name

> `readonly` **name**: `string`

Defined in: [packages/agent-sdk/src/instructions.ts:170](https://github.com/zocomputer/zov2-code/blob/94be7c286c5c8961c9d40350c41cf663e8ab4554/packages/agent-sdk/src/instructions.ts#L170)

The subagent's tool name (its `agent/subagents/<id>/` directory name).

***

### when

> `readonly` **when**: `string`

Defined in: [packages/agent-sdk/src/instructions.ts:172](https://github.com/zocomputer/zov2-code/blob/94be7c286c5c8961c9d40350c41cf663e8ab4554/packages/agent-sdk/src/instructions.ts#L172)

When the parent should pick it, e.g. "read-only codebase questions".
