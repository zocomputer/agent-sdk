[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / LookToolOptions

# Interface: LookToolOptions

Defined in: [packages/agent-sdk/src/tools/look.ts:154](https://github.com/zocomputer/zov2-code/blob/a97705ed30ddbf8dde363ccc922ce6eb90aa90a3/packages/agent-sdk/src/tools/look.ts#L154)

Options for `createLookTool`: the workspace, the oracle config, and the injectable seams.

## Properties

### generateFn?

> `optional` **generateFn?**: [`LookGenerateFn`](../type-aliases/LookGenerateFn.md)

Defined in: [packages/agent-sdk/src/tools/look.ts:173](https://github.com/zocomputer/zov2-code/blob/a97705ed30ddbf8dde363ccc922ce6eb90aa90a3/packages/agent-sdk/src/tools/look.ts#L173)

The generate seam; defaults to `ai`'s `generateText`.

***

### io?

> `optional` **io?**: [`WorkspaceIoProvider`](../type-aliases/WorkspaceIoProvider.md)

Defined in: [packages/agent-sdk/src/tools/look.ts:163](https://github.com/zocomputer/zov2-code/blob/a97705ed30ddbf8dde363ccc922ce6eb90aa90a3/packages/agent-sdk/src/tools/look.ts#L163)

The I/O backend resolved per call (see ../workspace-io.ts). Defaults to
the local node:fs backend; hosted agents pass the sandbox provider so
the oracle sees the session workspace's bytes.

***

### maxInputBytes?

> `optional` **maxInputBytes?**: `number`

Defined in: [packages/agent-sdk/src/tools/look.ts:171](https://github.com/zocomputer/zov2-code/blob/a97705ed30ddbf8dde363ccc922ce6eb90aa90a3/packages/agent-sdk/src/tools/look.ts#L171)

Max file size (bytes) to send. Defaults to
[DEFAULT\_LOOK\_MAX\_INPUT\_BYTES](../variables/DEFAULT_LOOK_MAX_INPUT_BYTES.md) (the Gemini inline-data budget —
the binding constraint is the gateway request size, not the medium).

***

### noun?

> `optional` **noun?**: `string`

Defined in: [packages/agent-sdk/src/tools/look.ts:157](https://github.com/zocomputer/zov2-code/blob/a97705ed30ddbf8dde363ccc922ce6eb90aa90a3/packages/agent-sdk/src/tools/look.ts#L157)

What the description calls the workspace. Defaults to "workspace".

***

### oracle

> **oracle**: [`LookOracleConfig`](LookOracleConfig.md)

Defined in: [packages/agent-sdk/src/tools/look.ts:165](https://github.com/zocomputer/zov2-code/blob/a97705ed30ddbf8dde363ccc922ce6eb90aa90a3/packages/agent-sdk/src/tools/look.ts#L165)

The oracle: model, display name, capabilities, optional headers.

***

### workspace

> **workspace**: [`Workspace`](Workspace.md)

Defined in: [packages/agent-sdk/src/tools/look.ts:155](https://github.com/zocomputer/zov2-code/blob/a97705ed30ddbf8dde363ccc922ce6eb90aa90a3/packages/agent-sdk/src/tools/look.ts#L155)
