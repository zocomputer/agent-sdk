[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / LookToolOptions

# Interface: LookToolOptions

Defined in: [packages/agent-sdk/src/tools/look.ts:157](https://github.com/zocomputer/zov2-code/blob/8ddca74b7284f16fe6a147e3eb2a55bed9838617/packages/agent-sdk/src/tools/look.ts#L157)

Options for `createLookTool`: the workspace, the oracle config, and the injectable seams.

## Properties

### generateFn?

> `optional` **generateFn?**: [`LookGenerateFn`](../type-aliases/LookGenerateFn.md)

Defined in: [packages/agent-sdk/src/tools/look.ts:176](https://github.com/zocomputer/zov2-code/blob/8ddca74b7284f16fe6a147e3eb2a55bed9838617/packages/agent-sdk/src/tools/look.ts#L176)

The generate seam; defaults to `ai`'s `generateText`.

***

### io?

> `optional` **io?**: [`WorkspaceIoProvider`](../type-aliases/WorkspaceIoProvider.md)

Defined in: [packages/agent-sdk/src/tools/look.ts:166](https://github.com/zocomputer/zov2-code/blob/8ddca74b7284f16fe6a147e3eb2a55bed9838617/packages/agent-sdk/src/tools/look.ts#L166)

The I/O backend resolved per call (see ../workspace-io.ts). Defaults to
the local node:fs backend; hosted agents pass the sandbox provider so
the oracle sees the session workspace's bytes.

***

### maxInputBytes?

> `optional` **maxInputBytes?**: `number`

Defined in: [packages/agent-sdk/src/tools/look.ts:174](https://github.com/zocomputer/zov2-code/blob/8ddca74b7284f16fe6a147e3eb2a55bed9838617/packages/agent-sdk/src/tools/look.ts#L174)

Max file size (bytes) to send. Defaults to
[DEFAULT\_LOOK\_MAX\_INPUT\_BYTES](../variables/DEFAULT_LOOK_MAX_INPUT_BYTES.md) (the Gemini inline-data budget —
the binding constraint is the gateway request size, not the medium).

***

### noun?

> `optional` **noun?**: `string`

Defined in: [packages/agent-sdk/src/tools/look.ts:160](https://github.com/zocomputer/zov2-code/blob/8ddca74b7284f16fe6a147e3eb2a55bed9838617/packages/agent-sdk/src/tools/look.ts#L160)

What the description calls the workspace. Defaults to "workspace".

***

### oracle

> **oracle**: [`LookOracleConfig`](LookOracleConfig.md)

Defined in: [packages/agent-sdk/src/tools/look.ts:168](https://github.com/zocomputer/zov2-code/blob/8ddca74b7284f16fe6a147e3eb2a55bed9838617/packages/agent-sdk/src/tools/look.ts#L168)

The oracle: model, display name, capabilities, optional headers.

***

### workspace

> **workspace**: [`Workspace`](Workspace.md)

Defined in: [packages/agent-sdk/src/tools/look.ts:158](https://github.com/zocomputer/zov2-code/blob/8ddca74b7284f16fe6a147e3eb2a55bed9838617/packages/agent-sdk/src/tools/look.ts#L158)
