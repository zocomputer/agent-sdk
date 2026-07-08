[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / sandboxIoProvider

# Function: sandboxIoProvider()

> **sandboxIoProvider**(`options`): [`WorkspaceIoProvider`](../type-aliases/WorkspaceIoProvider.md)

Defined in: [packages/agent-sdk/src/sandbox-io.ts:75](https://github.com/zocomputer/zov2-code/blob/a8636edc2f6184e686ebe291b26c3e5e9b3ae7ef/packages/agent-sdk/src/sandbox-io.ts#L75)

A `WorkspaceIoProvider` over the session sandbox — pass as the `io` option
of the file-tool factories (or use `createSandboxFileTools`, which wires
the whole set).

## Parameters

### options

[`SandboxIoOptions`](../interfaces/SandboxIoOptions.md)

## Returns

[`WorkspaceIoProvider`](../type-aliases/WorkspaceIoProvider.md)
