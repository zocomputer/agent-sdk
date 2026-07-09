[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / WorkspaceIoProvider

# Type Alias: WorkspaceIoProvider

> **WorkspaceIoProvider** = (`ctx`) => [`WorkspaceIO`](../interfaces/WorkspaceIO.md)

Defined in: [packages/agent-sdk/src/workspace-io.ts:138](https://github.com/zocomputer/zov2-code/blob/d22a2863f30f9fa1a7f8dbb051f97b4846076bf1/packages/agent-sdk/src/workspace-io.ts#L138)

Resolves the IO for one tool call. The local provider ignores `ctx`; the
sandbox provider (see ./sandbox-io.ts) resolves `ctx.getSandbox()` lazily,
so constructing the IO never touches the session.

## Parameters

### ctx

[`IoToolContext`](../interfaces/IoToolContext.md) \| `undefined`

## Returns

[`WorkspaceIO`](../interfaces/WorkspaceIO.md)
