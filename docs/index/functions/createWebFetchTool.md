[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createWebFetchTool

# Function: createWebFetchTool()

> **createWebFetchTool**(`opts`): `ToolDefinition`\<\{ `format?`: `"text"` \| `"markdown"` \| `"html"`; `timeout?`: `number`; `url`: `string`; \}, \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `format`: [`WebFetchFormat`](../type-aliases/WebFetchFormat.md); `note?`: `string`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `format`: [`WebFetchFormat`](../type-aliases/WebFetchFormat.md); `note?`: `string`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `pages`: `number`; `source`: `"pdf"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `pages`: `number`; `source`: `"pdf"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `source`: `"docx"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `source`: `"docx"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `slides`: `number`; `source`: `"pptx"` \| `"odp"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `slides`: `number`; `source`: `"pptx"` \| `"odp"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `source`: `"odt"` \| `"rtf"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `source`: `"odt"` \| `"rtf"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `sections`: `number`; `source`: `"epub"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `sections`: `number`; `source`: `"epub"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `cells`: `number`; `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `source`: `"ipynb"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `cells`: `number`; `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `source`: `"ipynb"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `sheetFormat`: [`SheetFormat`](../type-aliases/SheetFormat.md); `sheets`: readonly [`SheetMeta`](../interfaces/SheetMeta.md)[]; `source`: `"sheet"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `sheetFormat`: [`SheetFormat`](../type-aliases/SheetFormat.md); `sheets`: readonly [`SheetMeta`](../interfaces/SheetMeta.md)[]; `source`: `"sheet"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `bytes`: `number`; `contentType`: `string`; `finalUrl`: `string`; `height`: `number` \| `null`; `imageFormat`: [`ImageFormat`](../type-aliases/ImageFormat.md); `note`: `string`; `source`: `"image"`; `url`: `string`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `contentType`: `string`; `finalUrl?`: `undefined`; `height`: `number` \| `null`; `imageFormat`: [`ImageFormat`](../type-aliases/ImageFormat.md); `note`: `string`; `source`: `"image"`; `url`: `string`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `contentType`: `string`; `finalUrl`: `string`; `mediaFormat`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `source`: `"video"` \| `"audio"`; `url`: `string`; \} \| \{ `bytes`: `number`; `contentType`: `string`; `finalUrl?`: `undefined`; `mediaFormat`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `source`: `"video"` \| `"audio"`; `url`: `string`; \}\>

Defined in: [packages/agent-sdk/src/tools/webfetch.ts:142](https://github.com/zocomputer/zov2-code/blob/1fcc8b4b31cf28b6badb9d28c6512cd9261c730c/packages/agent-sdk/src/tools/webfetch.ts#L142)

Build the webfetch tool that fetches URLs, renders HTML to markdown, extracts documents, and describes media.

## Parameters

### opts

#### fetchImpl?

[`FetchLike`](../type-aliases/FetchLike.md)

Injectable for tests; defaults to global fetch.

#### imageUnavailableHint?

`string`

The "what to do instead" sentence in the image result note when the
pixels can't be delivered (attach disabled or over the size cap).
Defaults to asking the user to attach the image; agents without HITL
(e.g. task subagents) substitute advice that's actually actionable.

#### maxInlineContentChars?

`number`

Inline-first mode's character budget (no effect when `spillDir` is
set). Defaults to [DEFAULT\_MAX\_INLINE\_CONTENT\_CHARS](../variables/DEFAULT_MAX_INLINE_CONTENT_CHARS.md).

#### mediaUnavailableHint?

`string`

The "what to do instead" sentence in the video/audio result note when
the bytes can't be delivered (attach disabled — the default — or over
the cap). Defaults to the bash download suggestion; agents with a look
oracle route to download-then-look instead.

#### spillDir?

`string`

Where oversized output spills as a file the truncation marker names —
the right mode wherever `read` shares a filesystem with this tool (a
local agent): content over ~50k chars truncates head+tail and the
complete output lands on disk. **Omit for the inline-first mode** (the
hosted/split-topology default, where a spill would land on the eve
process's disk that the sandbox-backed `read` can't reach): the whole
rendered content returns inline up to `maxInlineContentChars`, then
truncates head+tail with no file to point at.

#### workspace

[`Workspace`](../interfaces/Workspace.md)

## Returns

`ToolDefinition`\<\{ `format?`: `"text"` \| `"markdown"` \| `"html"`; `timeout?`: `number`; `url`: `string`; \}, \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `format`: [`WebFetchFormat`](../type-aliases/WebFetchFormat.md); `note?`: `string`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `format`: [`WebFetchFormat`](../type-aliases/WebFetchFormat.md); `note?`: `string`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `pages`: `number`; `source`: `"pdf"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `pages`: `number`; `source`: `"pdf"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `source`: `"docx"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `source`: `"docx"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `slides`: `number`; `source`: `"pptx"` \| `"odp"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `slides`: `number`; `source`: `"pptx"` \| `"odp"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `source`: `"odt"` \| `"rtf"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `source`: `"odt"` \| `"rtf"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `sections`: `number`; `source`: `"epub"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `sections`: `number`; `source`: `"epub"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `cells`: `number`; `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `source`: `"ipynb"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `cells`: `number`; `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `source`: `"ipynb"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `sheetFormat`: [`SheetFormat`](../type-aliases/SheetFormat.md); `sheets`: readonly [`SheetMeta`](../interfaces/SheetMeta.md)[]; `source`: `"sheet"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `sheetFormat`: [`SheetFormat`](../type-aliases/SheetFormat.md); `sheets`: readonly [`SheetMeta`](../interfaces/SheetMeta.md)[]; `source`: `"sheet"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `bytes`: `number`; `contentType`: `string`; `finalUrl`: `string`; `height`: `number` \| `null`; `imageFormat`: [`ImageFormat`](../type-aliases/ImageFormat.md); `note`: `string`; `source`: `"image"`; `url`: `string`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `contentType`: `string`; `finalUrl?`: `undefined`; `height`: `number` \| `null`; `imageFormat`: [`ImageFormat`](../type-aliases/ImageFormat.md); `note`: `string`; `source`: `"image"`; `url`: `string`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `contentType`: `string`; `finalUrl`: `string`; `mediaFormat`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `source`: `"video"` \| `"audio"`; `url`: `string`; \} \| \{ `bytes`: `number`; `contentType`: `string`; `finalUrl?`: `undefined`; `mediaFormat`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `source`: `"video"` \| `"audio"`; `url`: `string`; \}\>
