[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createSandboxFileTools

# Function: createSandboxFileTools()

> **createSandboxFileTools**(`options`): `object`

Defined in: [packages/agent-sdk/src/index.ts:515](https://github.com/zocomputer/zov2-code/blob/ef70d86dc0c3cdb95eb7c208e5ea40a4edf9effb/packages/agent-sdk/src/index.ts#L515)

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

#### instructions.stack

> **stack**: `DynamicSentinel`

The composed instruction stack (see
`createInstructionStackInstruction`), pre-configured for the sandbox
topology: no repo-conventions section (the workspace isn't on this
process's disk and instruction resolvers have no sandbox access —
nested conventions ride the read tool's dir-conventions riders
instead), and the parallel-tools section matches this toolset's
`notifications` setting. The rest of the baseline — workflow,
planning, subagents, media (when the oracle is wired), hitl,
communication — targets eve's framework tools plus this toolset.
Honors `instructionTier`, `omitInstructionSections`, and
`extraInstructionSections`.

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

### tools

> **tools**: `object`

#### tools.bash

> **bash**: `ToolDefinition`\<\{ `command`: `string`; `cwd?`: `string`; `foreground_ms?`: `number`; `timeout_ms?`: `number`; \}, \{ `exitCode`: `number` \| `null`; `mode`: `"completed"`; `stderr`: `string`; `stdout`: `string`; `timedOut`: `boolean`; `workdir`: `string`; \} \| \{ `exitCode?`: `undefined`; `mode`: `"backgrounded"`; `note`: `string`; `progress`: [`RunProgress`](../interfaces/RunProgress.md); `status`: `"running"`; `stderr?`: `undefined`; `stdout?`: `undefined`; `task_id`: `string`; `timedOut?`: `undefined`; `watching`: `string` \| `undefined`; `workdir`: `string`; \} \| \{ `exitCode?`: `undefined`; `mode`: `"backgrounded"`; `note`: `string`; `progress`: [`RunProgress`](../interfaces/RunProgress.md); `status`: `"running"`; `stderr?`: `undefined`; `stdout?`: `undefined`; `task_id`: `string`; `timedOut?`: `undefined`; `workdir`: `string`; \}\> \| `ToolDefinition`\<\{ `command`: `string`; `cwd?`: `string`; `foreground_ms?`: `number`; `notify?`: \{ `debounce_ms?`: `number`; `pattern`: `string`; `reason`: `string`; \}; `timeout_ms?`: `number`; \}, \{ `exitCode`: `number` \| `null`; `mode`: `"completed"`; `stderr`: `string`; `stdout`: `string`; `timedOut`: `boolean`; `workdir`: `string`; \} \| \{ `exitCode?`: `undefined`; `mode`: `"backgrounded"`; `note`: `string`; `progress`: [`RunProgress`](../interfaces/RunProgress.md); `status`: `"running"`; `stderr?`: `undefined`; `stdout?`: `undefined`; `task_id`: `string`; `timedOut?`: `undefined`; `watching`: `string` \| `undefined`; `workdir`: `string`; \} \| \{ `exitCode?`: `undefined`; `mode`: `"backgrounded"`; `note`: `string`; `progress`: [`RunProgress`](../interfaces/RunProgress.md); `status`: `"running"`; `stderr?`: `undefined`; `stdout?`: `undefined`; `task_id`: `string`; `timedOut?`: `undefined`; `workdir`: `string`; \}\>

#### tools.edit

> **edit**: `ToolDefinition`\<\{ `new_string`: `string`; `old_string`: `string`; `path`: `string`; `replace_all?`: `boolean`; \}, \{ `matched`: [`MatchStrategy`](../type-aliases/MatchStrategy.md); `ok`: `boolean`; `path`: `string`; `replacements`: `number`; \}\>

#### tools.glob

> **glob**: `ToolDefinition`\<\{ `limit?`: `number`; `pattern`: `string`; \}, \{ `count`: `number`; `files`: `string`[]; `note?`: `string`; `pattern`: `string`; `truncated`: `boolean`; \}\>

#### tools.grep

> **grep**: `ToolDefinition`\<\{ `glob?`: `string`; `ignore_case?`: `boolean`; `max_results?`: `number`; `path?`: `string`; `pattern`: `string`; \}, [`GrepResult`](../interfaces/GrepResult.md)\>

#### tools.look?

> `optional` **look?**: `ToolDefinition`\<\{ `path`: `string`; `prompt`: `string`; \}, \{ `answer`: `string`; `media_type`: `string`; `model`: `string`; `path`: `string`; \}\>

#### tools.read

> **read**: `ToolDefinition`\<\{ `limit?`: `number`; `offset?`: `number`; `path`: `string`; \}, \{ `content`: `string`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions?`: `undefined`; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `endLine`: `number`; `note`: `string` \| `null`; `pages`: `number`; `path`: `string`; `source`: `"pdf"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions?`: `undefined`; `endLine`: `number`; `note`: `string` \| `null`; `pages`: `number`; `path`: `string`; `source`: `"pdf"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `source`: `"docx"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions?`: `undefined`; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `source`: `"docx"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `slides`: `number`; `source`: `"pptx"` \| `"odp"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions?`: `undefined`; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `slides`: `number`; `source`: `"pptx"` \| `"odp"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `source`: `"odt"` \| `"rtf"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions?`: `undefined`; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `source`: `"odt"` \| `"rtf"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `sections`: `number`; `source`: `"epub"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions?`: `undefined`; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `sections`: `number`; `source`: `"epub"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `cells`: `number`; `content`: `string`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `source`: `"ipynb"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `cells`: `number`; `content`: `string`; `directory_conventions?`: `undefined`; `endLine`: `number`; `note`: `string` \| `null`; `path`: `string`; `source`: `"ipynb"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `endLine`: `number`; `format`: [`SheetFormat`](../type-aliases/SheetFormat.md); `note`: `string` \| `null`; `path`: `string`; `sheets`: readonly [`SheetMeta`](../interfaces/SheetMeta.md)[]; `source`: `"sheet"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `content`: `string`; `directory_conventions?`: `undefined`; `endLine`: `number`; `format`: [`SheetFormat`](../type-aliases/SheetFormat.md); `note`: `string` \| `null`; `path`: `string`; `sheets`: readonly [`SheetMeta`](../interfaces/SheetMeta.md)[]; `source`: `"sheet"`; `startLine`: `number`; `totalLines`: `number`; `truncated`: `boolean`; \} \| \{ `bytes`: `number`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `format`: [`ImageFormat`](../type-aliases/ImageFormat.md); `height`: `number` \| `null`; `note`: `string`; `path`: `string`; `source`: `"image"`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `directory_conventions?`: `undefined`; `format`: [`ImageFormat`](../type-aliases/ImageFormat.md); `height`: `number` \| `null`; `note`: `string`; `path`: `string`; `source`: `"image"`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `chatAttachment`: \{ `dataUrl`: `string`; `filename`: `string`; `height`: `number` \| `null`; `kind`: `"image"`; `mediaType`: `string`; `width`: `number` \| `null`; \}; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `format`: [`ImageFormat`](../type-aliases/ImageFormat.md); `height`: `number` \| `null`; `note`: `string`; `path`: `string`; `source`: `"image"`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `chatAttachment`: \{ `dataUrl`: `string`; `filename`: `string`; `height`: `number` \| `null`; `kind`: `"image"`; `mediaType`: `string`; `width`: `number` \| `null`; \}; `directory_conventions?`: `undefined`; `format`: [`ImageFormat`](../type-aliases/ImageFormat.md); `height`: `number` \| `null`; `note`: `string`; `path`: `string`; `source`: `"image"`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `format`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `path`: `string`; `source`: `"video"` \| `"audio"`; \} \| \{ `bytes`: `number`; `directory_conventions?`: `undefined`; `format`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `path`: `string`; `source`: `"video"` \| `"audio"`; \} \| \{ `bytes`: `number`; `chatAttachment`: [`ChatAttachment`](../../attachments/type-aliases/ChatAttachment.md); `directory_conventions`: [`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]; `format`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `path`: `string`; `source`: `"video"` \| `"audio"`; \} \| \{ `bytes`: `number`; `chatAttachment`: [`ChatAttachment`](../../attachments/type-aliases/ChatAttachment.md); `directory_conventions?`: `undefined`; `format`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `path`: `string`; `source`: `"video"` \| `"audio"`; \}\>

#### tools.tasks

> **tasks**: `DynamicSentinel`

#### tools.write

> **write**: `ToolDefinition`\<\{ `content`: `string`; `path`: `string`; \}, \{ `bytes`: `number`; `created`: `boolean`; `ok`: `boolean`; `path`: `string`; \}\>

### workspace

> **workspace**: [`Workspace`](../interfaces/Workspace.md)
