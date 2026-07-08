[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createSandboxFileTools

# Function: createSandboxFileTools()

> **createSandboxFileTools**(`options`): `object`

Defined in: [packages/agent-sdk/src/index.ts:308](https://github.com/zocomputer/zov2-code/blob/e246fc7c6576db819f4636c288ce8b7c7818f506/packages/agent-sdk/src/index.ts#L308)

Create sandbox-backed file tools for hosted agents: read/edit/write/glob/grep
route through the sandbox session instead of the harness's local disk. Returns
the workspace, IO provider, and the five tools.

## Parameters

### options

[`SandboxFileToolsOptions`](../interfaces/SandboxFileToolsOptions.md)

## Returns

`object`

### io

> **io**: [`WorkspaceIoProvider`](../type-aliases/WorkspaceIoProvider.md)

### tools

> **tools**: `object`

#### tools.edit

> **edit**: `ToolDefinition`\<\{ `new_string`: `string`; `old_string`: `string`; `path`: `string`; `replace_all?`: `boolean`; \}, \{ `matched`: [`MatchStrategy`](../type-aliases/MatchStrategy.md); `ok`: `boolean`; `path`: `string`; `replacements`: `number`; \}\>

#### tools.glob

> **glob**: `ToolDefinition`\<\{ `limit?`: `number`; `pattern`: `string`; \}, \{ `count`: `number`; `files`: `string`[]; `note?`: `string`; `pattern`: `string`; `truncated`: `boolean`; \}\>

#### tools.grep

> **grep**: `ToolDefinition`\<\{ `glob?`: `string`; `ignore_case?`: `boolean`; `max_results?`: `number`; `path?`: `string`; `pattern`: `string`; \}, [`GrepResult`](../interfaces/GrepResult.md)\>

#### tools.read

> **read**: `ToolDefinition`\<\{ `limit?`: `number`; `offset?`: `number`; `path`: `string`; \}, \{ `content`: `string`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions?`: `undefined`; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `endLine`: `number`; `note`: `string` \| `null`; `pages`: `number`; `path`: `string`; `source`: `"pdf"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions?`: `undefined`; `endLine`: `number`; `note`: `string` \| `null`; `pages`: `number`; `path`: `string`; `source`: `"pdf"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `source`: `"docx"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions?`: `undefined`; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `source`: `"docx"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `endLine`: `number`; `format`: [`SheetFormat`](../type-aliases/SheetFormat.md); `note`: `string` \| `null`; `path`: `string`; `sheets`: readonly [`SheetMeta`](../interfaces/SheetMeta.md)[]; `source`: `"sheet"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions?`: `undefined`; `endLine`: `number`; `format`: [`SheetFormat`](../type-aliases/SheetFormat.md); `note`: `string` \| `null`; `path`: `string`; `sheets`: readonly [`SheetMeta`](../interfaces/SheetMeta.md)[]; `source`: `"sheet"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `bytes`: `number`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `format`: [`ImageFormat`](../type-aliases/ImageFormat.md); `height`: `number` \| `null`; `note`: `string`; `path`: `string`; `source`: `"image"`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `directory_conventions?`: `undefined`; `format`: [`ImageFormat`](../type-aliases/ImageFormat.md); `height`: `number` \| `null`; `note`: `string`; `path`: `string`; `source`: `"image"`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `chatAttachment`: \{ `dataUrl`: `string`; `filename`: `string`; `height`: `number` \| `null`; `kind`: `"image"`; `mediaType`: `string`; `width`: `number` \| `null`; \}; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `format`: [`ImageFormat`](../type-aliases/ImageFormat.md); `height`: `number` \| `null`; `note`: `string`; `path`: `string`; `source`: `"image"`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `chatAttachment`: \{ `dataUrl`: `string`; `filename`: `string`; `height`: `number` \| `null`; `kind`: `"image"`; `mediaType`: `string`; `width`: `number` \| `null`; \}; `directory_conventions?`: `undefined`; `format`: [`ImageFormat`](../type-aliases/ImageFormat.md); `height`: `number` \| `null`; `note`: `string`; `path`: `string`; `source`: `"image"`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `format`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `path`: `string`; `source`: `"video"` \| `"audio"`; \} \| \{ `bytes`: `number`; `directory_conventions?`: `undefined`; `format`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `path`: `string`; `source`: `"video"` \| `"audio"`; \} \| \{ `bytes`: `number`; `chatAttachment`: [`ChatAttachment`](../../attachments/type-aliases/ChatAttachment.md); `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `format`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `path`: `string`; `source`: `"video"` \| `"audio"`; \} \| \{ `bytes`: `number`; `chatAttachment`: [`ChatAttachment`](../../attachments/type-aliases/ChatAttachment.md); `directory_conventions?`: `undefined`; `format`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `path`: `string`; `source`: `"video"` \| `"audio"`; \}\>

#### tools.write

> **write**: `ToolDefinition`\<\{ `content`: `string`; `path`: `string`; \}, \{ `bytes`: `number`; `created`: `boolean`; `ok`: `boolean`; `path`: `string`; \}\>

### workspace

> **workspace**: [`Workspace`](../interfaces/Workspace.md)
