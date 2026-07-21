[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / WorkspaceIoProvider

# Type Alias: WorkspaceIoProvider

> **WorkspaceIoProvider** = (`ctx`) => [`WorkspaceIO`](../interfaces/WorkspaceIO.md)

Defined in: [packages/agent-sdk/src/workspace-io.ts:142](https://github.com/zocomputer/zov2-code/blob/c064bb48e9a6d214ad3688019aaf958920a35455/packages/agent-sdk/src/workspace-io.ts#L142)

Resolves the IO for one tool call. The local provider ignores `ctx`; the
sandbox provider (see ./sandbox-io.ts) resolves `ctx.getSandbox()` lazily,
so constructing the IO never touches the session.

## Parameters

### ctx

[`IoToolContext`](../interfaces/IoToolContext.md) \| `undefined`

## Returns

[`WorkspaceIO`](../interfaces/WorkspaceIO.md)
