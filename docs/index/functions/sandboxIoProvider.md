[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / sandboxIoProvider

# Function: sandboxIoProvider()

> **sandboxIoProvider**(`options`): [`WorkspaceIoProvider`](../type-aliases/WorkspaceIoProvider.md)

Defined in: [packages/agent-sdk/src/sandbox-io.ts:81](https://github.com/zocomputer/zov2-code/blob/2480a6ef0f68d759f57bf84a8fcb14c879dd765d/packages/agent-sdk/src/sandbox-io.ts#L81)

A `WorkspaceIoProvider` over the session sandbox — pass as the `io` option
of the file-tool factories (or use `createSandboxFileTools`, which wires
the whole set).

## Parameters

### options

[`SandboxIoOptions`](../interfaces/SandboxIoOptions.md)

## Returns

[`WorkspaceIoProvider`](../type-aliases/WorkspaceIoProvider.md)
