[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / SubagentRosterEntry

# Interface: SubagentRosterEntry

Defined in: [packages/agent-sdk/src/instructions.ts:477](https://github.com/zocomputer/zov2-code/blob/fc4b6dd8dd680b4495b1f44b776f9a8d76104d40/packages/agent-sdk/src/instructions.ts#L477)

One declared subagent the delegation playbook should route work to.

## Properties

### name

> `readonly` **name**: `string`

Defined in: [packages/agent-sdk/src/instructions.ts:479](https://github.com/zocomputer/zov2-code/blob/fc4b6dd8dd680b4495b1f44b776f9a8d76104d40/packages/agent-sdk/src/instructions.ts#L479)

The subagent's tool name (its `agent/subagents/<id>/` directory name).

***

### when

> `readonly` **when**: `string`

Defined in: [packages/agent-sdk/src/instructions.ts:481](https://github.com/zocomputer/zov2-code/blob/fc4b6dd8dd680b4495b1f44b776f9a8d76104d40/packages/agent-sdk/src/instructions.ts#L481)

When the parent should pick it, e.g. "read-only codebase questions".
