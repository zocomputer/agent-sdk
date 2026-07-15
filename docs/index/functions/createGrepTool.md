[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createGrepTool

# Function: createGrepTool()

> **createGrepTool**(`opts`): `ToolDefinition`\<\{ `glob?`: `string`; `ignore_case?`: `boolean`; `max_results?`: `number`; `path?`: `string`; `pattern`: `string`; \}, [`GrepResult`](../interfaces/GrepResult.md)\>

Defined in: [packages/agent-sdk/src/tools/grep.ts:45](https://github.com/zocomputer/zov2-code/blob/344fef7287e3cdac215bfeba4bb54fc2101e5e6e/packages/agent-sdk/src/tools/grep.ts#L45)

Build the grep tool for searching file contents by regex, with optional overflow spill to a result file.

## Parameters

### opts

#### io?

[`WorkspaceIoProvider`](../type-aliases/WorkspaceIoProvider.md)

Per-call I/O backend (../workspace-io.ts). Defaults to local node:fs.

#### noun

`string`

#### spillDir?

`string`

Directory for overflow match lists; omit to keep the stop-at-cap behavior.

#### workspace

[`Workspace`](../interfaces/Workspace.md)

## Returns

`ToolDefinition`\<\{ `glob?`: `string`; `ignore_case?`: `boolean`; `max_results?`: `number`; `path?`: `string`; `pattern`: `string`; \}, [`GrepResult`](../interfaces/GrepResult.md)\>
