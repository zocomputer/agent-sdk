[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / sandboxIoProvider

# Function: sandboxIoProvider()

> **sandboxIoProvider**(`options`): [`WorkspaceIoProvider`](../type-aliases/WorkspaceIoProvider.md)

Defined in: [packages/agent-sdk/src/sandbox-io.ts:81](https://github.com/zocomputer/zov2-code/blob/ff98edef5b507bf96c80f8f4c36882d827c8a81e/packages/agent-sdk/src/sandbox-io.ts#L81)

A `WorkspaceIoProvider` over the session sandbox — pass as the `io` option
of the file-tool factories (or use `createSandboxFileTools`, which wires
the whole set).

## Parameters

### options

[`SandboxIoOptions`](../interfaces/SandboxIoOptions.md)

## Returns

[`WorkspaceIoProvider`](../type-aliases/WorkspaceIoProvider.md)
