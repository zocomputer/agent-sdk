[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createGrepTool

# Function: createGrepTool()

> **createGrepTool**(`opts`): `ToolDefinition`\<\{ `glob?`: `string`; `ignore_case?`: `boolean`; `max_results?`: `number`; `path?`: `string`; `pattern`: `string`; \}, [`GrepResult`](../interfaces/GrepResult.md)\>

Defined in: [packages/agent-sdk/src/tools/grep.ts:45](https://github.com/zocomputer/zov2-code/blob/7513818a294edcc3dc2a057e2719d829477c04ad/packages/agent-sdk/src/tools/grep.ts#L45)

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
