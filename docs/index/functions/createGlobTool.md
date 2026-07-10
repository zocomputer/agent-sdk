[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createGlobTool

# Function: createGlobTool()

> **createGlobTool**(`opts`): `ToolDefinition`\<\{ `limit?`: `number`; `pattern`: `string`; \}, \{ `count`: `number`; `files`: `string`[]; `note?`: `string`; `pattern`: `string`; `truncated`: `boolean`; \}\>

Defined in: [packages/agent-sdk/src/tools/glob.ts:13](https://github.com/zocomputer/zov2-code/blob/ef70d86dc0c3cdb95eb7c208e5ea40a4edf9effb/packages/agent-sdk/src/tools/glob.ts#L13)

Build the glob tool for finding files by pattern, backed by git ls-files or the fallback walk.

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

`ToolDefinition`\<\{ `limit?`: `number`; `pattern`: `string`; \}, \{ `count`: `number`; `files`: `string`[]; `note?`: `string`; `pattern`: `string`; `truncated`: `boolean`; \}\>
