[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / WorkspaceIoProvider

# Type Alias: WorkspaceIoProvider

> **WorkspaceIoProvider** = (`ctx`) => [`WorkspaceIO`](../interfaces/WorkspaceIO.md)

Defined in: [packages/agent-sdk/src/workspace-io.ts:142](https://github.com/zocomputer/zov2-code/blob/9538a0a8ac4443391049ca02b620175fec05d4cd/packages/agent-sdk/src/workspace-io.ts#L142)

Resolves the IO for one tool call. The local provider ignores `ctx`; the
sandbox provider (see ./sandbox-io.ts) resolves `ctx.getSandbox()` lazily,
so constructing the IO never touches the session.

## Parameters

### ctx

[`IoToolContext`](../interfaces/IoToolContext.md) \| `undefined`

## Returns

[`WorkspaceIO`](../interfaces/WorkspaceIO.md)
