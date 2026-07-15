[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createEditTool

# Function: createEditTool()

> **createEditTool**(`opts`): `ToolDefinition`\<\{ `new_string`: `string`; `old_string`: `string`; `path`: `string`; `replace_all?`: `boolean`; \}, \{ `matched`: [`MatchStrategy`](../type-aliases/MatchStrategy.md); `ok`: `boolean`; `path`: `string`; `replacements`: `number`; \}\>

Defined in: [packages/agent-sdk/src/tools/edit.ts:23](https://github.com/zocomputer/zov2-code/blob/1e681aac14f2dac158459843dc60bdd734625bf0/packages/agent-sdk/src/tools/edit.ts#L23)

Build the edit tool for string replacement in existing files.

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

`ToolDefinition`\<\{ `new_string`: `string`; `old_string`: `string`; `path`: `string`; `replace_all?`: `boolean`; \}, \{ `matched`: [`MatchStrategy`](../type-aliases/MatchStrategy.md); `ok`: `boolean`; `path`: `string`; `replacements`: `number`; \}\>
