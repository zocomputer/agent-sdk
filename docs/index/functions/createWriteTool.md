[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createWriteTool

# Function: createWriteTool()

> **createWriteTool**(`opts`): `ToolDefinition`\<\{ `content`: `string`; `path`: `string`; \}, \{ `bytes`: `number`; `created`: `boolean`; `ok`: `boolean`; `path`: `string`; \}\>

Defined in: [packages/agent-sdk/src/tools/write.ts:12](https://github.com/zocomputer/zov2-code/blob/c013587aa4ecd77d27b6774cf5b1fead3e0418d5/packages/agent-sdk/src/tools/write.ts#L12)

Build the write tool for creating or overwriting complete files.

## Parameters

### opts

#### io?

[`WorkspaceIoProvider`](../type-aliases/WorkspaceIoProvider.md)

Per-call I/O backend (../workspace-io.ts). Defaults to local node:fs.

#### noun

`string`

#### workspace

[`Workspace`](../interfaces/Workspace.md)

## Returns

`ToolDefinition`\<\{ `content`: `string`; `path`: `string`; \}, \{ `bytes`: `number`; `created`: `boolean`; `ok`: `boolean`; `path`: `string`; \}\>
