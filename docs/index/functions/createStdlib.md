[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createStdlib

# Function: createStdlib()

> **createStdlib**(`options`): `object`

Defined in: [packages/agent-sdk/src/index.ts:142](https://github.com/zocomputer/zov2-code/blob/56f3348e42f7f39e91ab5519d5b5feb8988805e9/packages/agent-sdk/src/index.ts#L142)

Create the standard library for a real-filesystem eve agent: workspace-scoped
file tools (read/edit/write/glob/grep), host bash, webfetch, the background-
task registry, and the matching dynamic instructions. Returns tools, the
workspace, runner, registry, and instructions.

## Parameters

### options

[`StdlibOptions`](../interfaces/StdlibOptions.md)

## Returns

`object`

### backgroundables

> **backgroundables**: readonly [`BackgroundableOp`](../interfaces/BackgroundableOp.md)[]

### instructions

> **instructions**: `object`

#### instructions.communication

> **communication**: `DynamicSentinel`

#### instructions.hitl

> **hitl**: `DynamicSentinel`

#### instructions.parallelTools

> **parallelTools**: `DynamicSentinel`

#### instructions.repoConventions

> **repoConventions**: `DynamicSentinel`

#### instructions.subagents

> **subagents**: `DynamicSentinel`

#### instructions.workflow

> **workflow**: `DynamicSentinel`

### registry

> **registry**: [`TaskRegistry`](../interfaces/TaskRegistry.md)

### runner

> **runner**: [`CommandRunner`](../interfaces/CommandRunner.md)

### spillDir

> **spillDir**: `string`

### steerInbox

> **steerInbox**: [`SteerInbox`](../../steer-inbox/interfaces/SteerInbox.md) \| `null`

### tools

> **tools**: `object`

#### tools.bash

> **bash**: `ToolDefinition`\<\{ `command`: `string`; `cwd?`: `string`; `foreground_ms?`: `number`; `notify?`: \{ `debounce_ms?`: `number`; `pattern`: `string`; `reason`: `string`; \}; `timeout_ms?`: `number`; \}, \{ `exitCode`: `number` \| `null`; `mode`: `"completed"`; `stderr`: `string`; `stdout`: `string`; `timedOut`: `boolean`; `workdir`: `string`; \} \| \{ `exitCode?`: `undefined`; `mode`: `"backgrounded"`; `note`: `string`; `progress`: [`RunProgress`](../interfaces/RunProgress.md); `status`: `"running"`; `stderr?`: `undefined`; `stdout?`: `undefined`; `task_id`: `string`; `timedOut?`: `undefined`; `watching`: `string` \| `undefined`; `workdir`: `string`; \} \| \{ `exitCode?`: `undefined`; `mode`: `"backgrounded"`; `note`: `string`; `progress`: [`RunProgress`](../interfaces/RunProgress.md); `status`: `"running"`; `stderr?`: `undefined`; `stdout?`: `undefined`; `task_id`: `string`; `timedOut?`: `undefined`; `workdir`: `string`; \}\>

#### tools.edit

> **edit**: `ToolDefinition`\<\{ `new_string`: `string`; `old_string`: `string`; `path`: `string`; `replace_all?`: `boolean`; \}, \{ `ok`: `boolean`; `path`: `string`; `replacements`: `number`; \}\>

#### tools.glob

> **glob**: `ToolDefinition`\<\{ `limit?`: `number`; `pattern`: `string`; \}, \{ `count`: `number`; `files`: `string`[]; `note?`: `string`; `pattern`: `string`; `truncated`: `boolean`; \}\>

#### tools.grep

> **grep**: `ToolDefinition`\<\{ `glob?`: `string`; `ignore_case?`: `boolean`; `max_results?`: `number`; `path?`: `string`; `pattern`: `string`; \}, [`GrepResult`](../interfaces/GrepResult.md)\>

#### tools.read

> **read**: `ToolDefinition`\<\{ `limit?`: `number`; `offset?`: `number`; `path`: `string`; \}, \{ `content`: `string`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions?`: `undefined`; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `endLine`: `number`; `note`: `string` \| `null`; `pages`: `number`; `path`: `string`; `source`: `"pdf"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions?`: `undefined`; `endLine`: `number`; `note`: `string` \| `null`; `pages`: `number`; `path`: `string`; `source`: `"pdf"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `source`: `"docx"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions?`: `undefined`; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `source`: `"docx"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `endLine`: `number`; `format`: [`SheetFormat`](../type-aliases/SheetFormat.md); `note`: `string` \| `null`; `path`: `string`; `sheets`: readonly [`SheetMeta`](../interfaces/SheetMeta.md)[]; `source`: `"sheet"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions?`: `undefined`; `endLine`: `number`; `format`: [`SheetFormat`](../type-aliases/SheetFormat.md); `note`: `string` \| `null`; `path`: `string`; `sheets`: readonly [`SheetMeta`](../interfaces/SheetMeta.md)[]; `source`: `"sheet"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `bytes`: `number`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `format`: [`ImageFormat`](../type-aliases/ImageFormat.md); `height`: `number` \| `null`; `note`: `string`; `path`: `string`; `source`: `"image"`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `directory_conventions?`: `undefined`; `format`: [`ImageFormat`](../type-aliases/ImageFormat.md); `height`: `number` \| `null`; `note`: `string`; `path`: `string`; `source`: `"image"`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `chatAttachment`: \{ `dataUrl`: `string`; `filename`: `string`; `height`: `number` \| `null`; `kind`: `"image"`; `mediaType`: `string`; `width`: `number` \| `null`; \}; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `format`: [`ImageFormat`](../type-aliases/ImageFormat.md); `height`: `number` \| `null`; `note`: `string`; `path`: `string`; `source`: `"image"`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `chatAttachment`: \{ `dataUrl`: `string`; `filename`: `string`; `height`: `number` \| `null`; `kind`: `"image"`; `mediaType`: `string`; `width`: `number` \| `null`; \}; `directory_conventions?`: `undefined`; `format`: [`ImageFormat`](../type-aliases/ImageFormat.md); `height`: `number` \| `null`; `note`: `string`; `path`: `string`; `source`: `"image"`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `format`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `path`: `string`; `source`: `"video"` \| `"audio"`; \} \| \{ `bytes`: `number`; `directory_conventions?`: `undefined`; `format`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `path`: `string`; `source`: `"video"` \| `"audio"`; \} \| \{ `bytes`: `number`; `chatAttachment`: [`ChatAttachment`](../../attachments/type-aliases/ChatAttachment.md); `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `format`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `path`: `string`; `source`: `"video"` \| `"audio"`; \} \| \{ `bytes`: `number`; `chatAttachment`: [`ChatAttachment`](../../attachments/type-aliases/ChatAttachment.md); `directory_conventions?`: `undefined`; `format`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `path`: `string`; `source`: `"video"` \| `"audio"`; \}\>

#### tools.tasks

> **tasks**: `DynamicSentinel`

#### tools.webfetch

> **webfetch**: `ToolDefinition`\<\{ `format?`: `"text"` \| `"markdown"` \| `"html"`; `timeout?`: `number`; `url`: `string`; \}, \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `format`: [`WebFetchFormat`](../type-aliases/WebFetchFormat.md); `note?`: `string`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `format`: [`WebFetchFormat`](../type-aliases/WebFetchFormat.md); `note?`: `string`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `pages`: `number`; `source`: `"pdf"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `pages`: `number`; `source`: `"pdf"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `source`: `"docx"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `source`: `"docx"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `sheetFormat`: [`SheetFormat`](../type-aliases/SheetFormat.md); `sheets`: readonly [`SheetMeta`](../interfaces/SheetMeta.md)[]; `source`: `"sheet"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `sheetFormat`: [`SheetFormat`](../type-aliases/SheetFormat.md); `sheets`: readonly [`SheetMeta`](../interfaces/SheetMeta.md)[]; `source`: `"sheet"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `bytes`: `number`; `contentType`: `string`; `finalUrl`: `string`; `height`: `number` \| `null`; `imageFormat`: [`ImageFormat`](../type-aliases/ImageFormat.md); `note`: `string`; `source`: `"image"`; `url`: `string`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `contentType`: `string`; `finalUrl?`: `undefined`; `height`: `number` \| `null`; `imageFormat`: [`ImageFormat`](../type-aliases/ImageFormat.md); `note`: `string`; `source`: `"image"`; `url`: `string`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `chatAttachment`: \{ `dataUrl`: `string`; `filename`: `string`; `height`: `number` \| `null`; `kind`: `"image"`; `mediaType`: `string`; `width`: `number` \| `null`; \}; `contentType`: `string`; `finalUrl`: `string`; `height`: `number` \| `null`; `imageFormat`: [`ImageFormat`](../type-aliases/ImageFormat.md); `note`: `string`; `source`: `"image"`; `url`: `string`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `chatAttachment`: \{ `dataUrl`: `string`; `filename`: `string`; `height`: `number` \| `null`; `kind`: `"image"`; `mediaType`: `string`; `width`: `number` \| `null`; \}; `contentType`: `string`; `finalUrl?`: `undefined`; `height`: `number` \| `null`; `imageFormat`: [`ImageFormat`](../type-aliases/ImageFormat.md); `note`: `string`; `source`: `"image"`; `url`: `string`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `contentType`: `string`; `finalUrl`: `string`; `mediaFormat`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `source`: `"video"` \| `"audio"`; `url`: `string`; \} \| \{ `bytes`: `number`; `contentType`: `string`; `finalUrl?`: `undefined`; `mediaFormat`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `source`: `"video"` \| `"audio"`; `url`: `string`; \} \| \{ `bytes`: `number`; `chatAttachment`: [`ChatAttachment`](../../attachments/type-aliases/ChatAttachment.md); `contentType`: `string`; `finalUrl`: `string`; `mediaFormat`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `source`: `"video"` \| `"audio"`; `url`: `string`; \} \| \{ `bytes`: `number`; `chatAttachment`: [`ChatAttachment`](../../attachments/type-aliases/ChatAttachment.md); `contentType`: `string`; `finalUrl?`: `undefined`; `mediaFormat`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `source`: `"video"` \| `"audio"`; `url`: `string`; \}\>

#### tools.write

> **write**: `ToolDefinition`\<\{ `content`: `string`; `path`: `string`; \}, \{ `bytes`: `number`; `created`: `boolean`; `ok`: `boolean`; `path`: `string`; \}\>

### workspace

> **workspace**: [`Workspace`](../interfaces/Workspace.md)
