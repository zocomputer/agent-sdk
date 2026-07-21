[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createSandboxFileTools

# Function: createSandboxFileTools()

> **createSandboxFileTools**(`options`): `object`

Defined in: [packages/agent-sdk/src/index.ts:146](https://github.com/zocomputer/zov2-code/blob/fc65ac4f3ad029ed138ee11331693cba0bd295b4/packages/agent-sdk/src/index.ts#L146)

Create the sandbox-backed toolset for hosted agents:
read/edit/write/glob/grep route through the sandbox session's file API and
bash through its `spawn` — instead of the harness's local disk and shell —
plus the stdlib's background-task tools (run_async/check_tasks/await_task)
over the same registry machinery. Returns the workspace, IO provider, the
tools, and a pre-configured `instructions.stack` (the composed baseline
prompt, minus the sections that don't apply to this topology — see its doc).

## Parameters

### options

[`SandboxFileToolsOptions`](../interfaces/SandboxFileToolsOptions.md)

## Returns

### backgroundables

> **backgroundables**: readonly [`BackgroundableOp`](../interfaces/BackgroundableOp.md)[]

The run_async-able ops (bash).

### instructions

> **instructions**: `object`

#### instructions.communication

> **communication**: `DynamicSentinel`\<\{ `markdown`: `string`; \}\>

#### instructions.hitl

> **hitl**: `DynamicSentinel`\<\{ `markdown`: `string`; \}\>

#### instructions.media?

> `optional` **media?**: `DynamicSentinel`\<\{ `markdown`: `string`; \}\>

#### instructions.parallelTools

> **parallelTools**: `DynamicSentinel`\<\{ `markdown`: `string`; \}\>

#### instructions.planning

> **planning**: `DynamicSentinel`\<\{ `markdown`: `string`; \}\>

#### instructions.stack

> **stack**: `DynamicSentinel`\<\{ `markdown`: `string`; \}\>

The composed instruction stack (see
`createInstructionStackInstruction`), pre-configured for the sandbox
topology: no repo-conventions section (the workspace isn't on this
process's disk and instruction resolvers have no sandbox access —
nested conventions ride the read tool's dir-conventions riders
instead). The rest of the baseline — workflow,
planning, subagents, media (when the oracle is wired), hitl,
communication — targets eve's framework tools plus this toolset.
Honors `instructionTier`, `omitInstructionSections`, and
`extraInstructionSections`.

#### instructions.subagents

> **subagents**: `DynamicSentinel`\<\{ `markdown`: `string`; \}\>

#### instructions.workflow

> **workflow**: `DynamicSentinel`\<\{ `markdown`: `string`; \}\>

### io

> **io**: [`WorkspaceIoProvider`](../type-aliases/WorkspaceIoProvider.md)

### mediaOracle

> **mediaOracle**: [`LookOracleConfig`](../interfaces/LookOracleConfig.md) \| `null` = `oracle`

The resolved look oracle (`null` when `mediaOracle` wasn't set) — same contract as `Stdlib.mediaOracle`.

### registry

> **registry**: [`TaskRegistry`](../interfaces/TaskRegistry.md)

The background-task registry behind `bash` auto-backgrounding and the task tools.

### runner

> **runner**: [`CommandRunnerProvider`](../type-aliases/CommandRunnerProvider.md)

The sandbox-backed command runner provider behind `bash`/`run_async`.

### taskTools

> **taskTools**: `object`

Static authored-tool entrypoints for hosted workflow runtimes.

#### taskTools.await\_task

> **await\_task**: `ToolDefinition`\<\{ `task_id`: `string`; `wait_ms?`: `number`; \}, \{ `elapsedMs`: `number`; `label`: `string`; `result`: `unknown`; `status`: `"error"` \| `"running"` \| `"done"` \| `"lost"`; `task_id`: `string` & `$brand`\<`"TaskId"`\>; `tool`: `string`; \} \| \{ `elapsedMs`: `number`; `error`: `string`; `label`: `string`; `status`: `"error"` \| `"running"` \| `"done"` \| `"lost"`; `task_id`: `string` & `$brand`\<`"TaskId"`\>; `tool`: `string`; \} \| \{ `elapsedMs`: `number`; `label`: `string`; `progress?`: \{ \} \| `null`; `status`: `"error"` \| `"running"` \| `"done"` \| `"lost"`; `task_id`: `string` & `$brand`\<`"TaskId"`\>; `tool`: `string`; \}\>

#### taskTools.check\_tasks

> **check\_tasks**: `ToolDefinition`\<`Record`\<`string`, `never`\>, \{ `runningCount`: `number`; `tasks`: `object`[]; \}\>

#### taskTools.run\_async

> **run\_async**: `ToolDefinition`\<\{ `input`: `Record`\<`string`, `unknown`\>; `tool`: `string`; \}, \{ `note`: `string`; `status`: `"running"`; `task_id`: `string` & `$brand`\<`"TaskId"`\>; `tool`: `string`; \}\> = `runAsync`

### tools

> **tools**: `object`

#### tools.bash

> **bash**: `ToolDefinition`\<\{ `command`: `string`; `cwd?`: `string`; `foreground_ms?`: `number`; `timeout_ms?`: `number`; \}, \{ `exitCode`: `number` \| `null`; `mode`: `"completed"`; `note?`: `undefined`; `progress?`: `undefined`; `status?`: `undefined`; `stderr`: `string`; `stdout`: `string`; `task_id?`: `undefined`; `timedOut`: `boolean`; `workdir`: `string`; \} \| \{ `exitCode?`: `undefined`; `mode`: `"backgrounded"`; `note`: `string`; `progress`: [`RunProgress`](../interfaces/RunProgress.md); `status`: `"running"`; `stderr?`: `undefined`; `stdout?`: `undefined`; `task_id`: `string` & `$brand`\<`"TaskId"`\>; `timedOut?`: `undefined`; `workdir`: `string`; \}\>

#### tools.edit

> **edit**: `ToolDefinition`\<\{ `new_string`: `string`; `old_string`: `string`; `path`: `string`; `replace_all?`: `boolean`; \}, \{ `matched`: [`MatchStrategy`](../type-aliases/MatchStrategy.md); `ok`: `boolean`; `path`: `string`; `replacements`: `number`; \}\>

#### tools.glob

> **glob**: `ToolDefinition`\<\{ `limit?`: `number`; `pattern`: `string`; \}, \{ `count`: `number`; `files`: `string`[]; `note?`: `string`; `pattern`: `string`; `truncated`: `boolean`; \}\>

#### tools.grep

> **grep**: `ToolDefinition`\<\{ `glob?`: `string`; `ignore_case?`: `boolean`; `max_results?`: `number`; `path?`: `string`; `pattern`: `string`; \}, [`GrepResult`](../interfaces/GrepResult.md)\>

#### tools.look?

> `optional` **look?**: `ToolDefinition`\<\{ `path`: `string`; `prompt`: `string`; \}, \{ `answer`: `string`; `media_type`: `string`; `model`: `string`; `path`: `string`; \}\>

#### tools.read

> **read**: `ToolDefinition`\<\{ `limit?`: `number`; `offset?`: `number`; `path`: `string`; \}, \{ `content`: `string`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions?`: `undefined`; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `endLine`: `number`; `note`: `string` \| `null`; `pages`: `number`; `path`: `string`; `source`: `"pdf"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions?`: `undefined`; `endLine`: `number`; `note`: `string` \| `null`; `pages`: `number`; `path`: `string`; `source`: `"pdf"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `source`: `"docx"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions?`: `undefined`; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `source`: `"docx"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `slides`: `number`; `source`: `"pptx"` \| `"odp"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions?`: `undefined`; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `slides`: `number`; `source`: `"pptx"` \| `"odp"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `source`: `"odt"` \| `"rtf"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions?`: `undefined`; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `source`: `"odt"` \| `"rtf"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `sections`: `number`; `source`: `"epub"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions?`: `undefined`; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `sections`: `number`; `source`: `"epub"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `cells`: `number`; `content`: `string`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `source`: `"ipynb"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `cells`: `number`; `content`: `string`; `directory_conventions?`: `undefined`; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `source`: `"ipynb"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `endLine`: `number`; `format`: [`SheetFormat`](../type-aliases/SheetFormat.md); `note`: `string` \| `null`; `path`: `string`; `sheets`: readonly [`SheetMeta`](../interfaces/SheetMeta.md)[]; `source`: `"sheet"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions?`: `undefined`; `endLine`: `number`; `format`: [`SheetFormat`](../type-aliases/SheetFormat.md); `note`: `string` \| `null`; `path`: `string`; `sheets`: readonly [`SheetMeta`](../interfaces/SheetMeta.md)[]; `source`: `"sheet"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `bytes`: `number`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `format`: [`ImageFormat`](../type-aliases/ImageFormat.md); `height`: `number` \| `null`; `note`: `string`; `path`: `string`; `source`: `"image"`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `directory_conventions?`: `undefined`; `format`: [`ImageFormat`](../type-aliases/ImageFormat.md); `height`: `number` \| `null`; `note`: `string`; `path`: `string`; `source`: `"image"`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `format`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `path`: `string`; `source`: `"video"` \| `"audio"`; \} \| \{ `bytes`: `number`; `directory_conventions?`: `undefined`; `format`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `path`: `string`; `source`: `"video"` \| `"audio"`; \}\>

#### tools.tasks

> **tasks**: `DynamicSentinel`\<\{ `await_task`: `ToolDefinition`\<\{ `task_id`: `string`; `wait_ms?`: `number`; \}, \{ `elapsedMs`: `number`; `label`: `string`; `result`: `unknown`; `status`: `"error"` \| `"running"` \| `"done"` \| `"lost"`; `task_id`: `string` & `$brand`\<`"TaskId"`\>; `tool`: `string`; \} \| \{ `elapsedMs`: `number`; `error`: `string`; `label`: `string`; `status`: `"error"` \| `"running"` \| `"done"` \| `"lost"`; `task_id`: `string` & `$brand`\<`"TaskId"`\>; `tool`: `string`; \} \| \{ `elapsedMs`: `number`; `label`: `string`; `progress?`: \{ \} \| `null`; `status`: `"error"` \| `"running"` \| `"done"` \| `"lost"`; `task_id`: `string` & `$brand`\<`"TaskId"`\>; `tool`: `string`; \}\>; `check_tasks`: `ToolDefinition`\<`Record`\<`string`, `never`\>, \{ `runningCount`: `number`; `tasks`: `object`[]; \}\>; `run_async`: `ToolDefinition`\<\{ `input`: `Record`\<`string`, `unknown`\>; `tool`: `string`; \}, \{ `note`: `string`; `status`: `"running"`; `task_id`: `string` & `$brand`\<`"TaskId"`\>; `tool`: `string`; \}\>; \} \| `null`\>

#### tools.todo

> **todo**: `ToolDefinition`\<`unknown`, `unknown`\>

#### tools.webfetch

> **webfetch**: `ToolDefinition`\<\{ `format?`: `"text"` \| `"markdown"` \| `"html"`; `timeout?`: `number`; `url`: `string`; \}, \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `format`: [`WebFetchFormat`](../type-aliases/WebFetchFormat.md); `note?`: `string`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `format`: [`WebFetchFormat`](../type-aliases/WebFetchFormat.md); `note?`: `string`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `pages`: `number`; `source`: `"pdf"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `pages`: `number`; `source`: `"pdf"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `source`: `"docx"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `source`: `"docx"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `slides`: `number`; `source`: `"pptx"` \| `"odp"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `slides`: `number`; `source`: `"pptx"` \| `"odp"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `source`: `"odt"` \| `"rtf"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `source`: `"odt"` \| `"rtf"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `sections`: `number`; `source`: `"epub"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `sections`: `number`; `source`: `"epub"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `cells`: `number`; `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `source`: `"ipynb"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `cells`: `number`; `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `source`: `"ipynb"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `sheetFormat`: [`SheetFormat`](../type-aliases/SheetFormat.md); `sheets`: readonly [`SheetMeta`](../interfaces/SheetMeta.md)[]; `source`: `"sheet"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `sheetFormat`: [`SheetFormat`](../type-aliases/SheetFormat.md); `sheets`: readonly [`SheetMeta`](../interfaces/SheetMeta.md)[]; `source`: `"sheet"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `bytes`: `number`; `contentType`: `string`; `finalUrl`: `string`; `height`: `number` \| `null`; `imageFormat`: [`ImageFormat`](../type-aliases/ImageFormat.md); `note`: `string`; `source`: `"image"`; `url`: `string`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `contentType`: `string`; `finalUrl?`: `undefined`; `height`: `number` \| `null`; `imageFormat`: [`ImageFormat`](../type-aliases/ImageFormat.md); `note`: `string`; `source`: `"image"`; `url`: `string`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `contentType`: `string`; `finalUrl`: `string`; `mediaFormat`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `source`: `"video"` \| `"audio"`; `url`: `string`; \} \| \{ `bytes`: `number`; `contentType`: `string`; `finalUrl?`: `undefined`; `mediaFormat`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `source`: `"video"` \| `"audio"`; `url`: `string`; \}\>

#### tools.write

> **write**: `ToolDefinition`\<\{ `content`: `string`; `path`: `string`; \}, \{ `bytes`: `number`; `created`: `boolean`; `ok`: `boolean`; `path`: `string`; \}\>

### workspace

> **workspace**: [`Workspace`](../interfaces/Workspace.md)
