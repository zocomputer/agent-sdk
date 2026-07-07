[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createWebFetchTool

# Function: createWebFetchTool()

> **createWebFetchTool**(`opts`): `ToolDefinition`\<\{ `format?`: `"text"` \| `"markdown"` \| `"html"`; `timeout?`: `number`; `url`: `string`; \}, \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `format`: [`WebFetchFormat`](../type-aliases/WebFetchFormat.md); `note?`: `string`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `format`: [`WebFetchFormat`](../type-aliases/WebFetchFormat.md); `note?`: `string`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `pages`: `number`; `source`: `"pdf"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `pages`: `number`; `source`: `"pdf"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `source`: `"docx"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `source`: `"docx"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `sheetFormat`: [`SheetFormat`](../type-aliases/SheetFormat.md); `sheets`: readonly [`SheetMeta`](../interfaces/SheetMeta.md)[]; `source`: `"sheet"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `sheetFormat`: [`SheetFormat`](../type-aliases/SheetFormat.md); `sheets`: readonly [`SheetMeta`](../interfaces/SheetMeta.md)[]; `source`: `"sheet"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `bytes`: `number`; `contentType`: `string`; `finalUrl`: `string`; `height`: `number` \| `null`; `imageFormat`: [`ImageFormat`](../type-aliases/ImageFormat.md); `note`: `string`; `source`: `"image"`; `url`: `string`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `contentType`: `string`; `finalUrl?`: `undefined`; `height`: `number` \| `null`; `imageFormat`: [`ImageFormat`](../type-aliases/ImageFormat.md); `note`: `string`; `source`: `"image"`; `url`: `string`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `chatAttachment`: \{ `dataUrl`: `string`; `filename`: `string`; `height`: `number` \| `null`; `kind`: `"image"`; `mediaType`: `string`; `width`: `number` \| `null`; \}; `contentType`: `string`; `finalUrl`: `string`; `height`: `number` \| `null`; `imageFormat`: [`ImageFormat`](../type-aliases/ImageFormat.md); `note`: `string`; `source`: `"image"`; `url`: `string`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `chatAttachment`: \{ `dataUrl`: `string`; `filename`: `string`; `height`: `number` \| `null`; `kind`: `"image"`; `mediaType`: `string`; `width`: `number` \| `null`; \}; `contentType`: `string`; `finalUrl?`: `undefined`; `height`: `number` \| `null`; `imageFormat`: [`ImageFormat`](../type-aliases/ImageFormat.md); `note`: `string`; `source`: `"image"`; `url`: `string`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `contentType`: `string`; `finalUrl`: `string`; `mediaFormat`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `source`: `"video"` \| `"audio"`; `url`: `string`; \} \| \{ `bytes`: `number`; `contentType`: `string`; `finalUrl?`: `undefined`; `mediaFormat`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `source`: `"video"` \| `"audio"`; `url`: `string`; \} \| \{ `bytes`: `number`; `chatAttachment`: [`ChatAttachment`](../../attachments/type-aliases/ChatAttachment.md); `contentType`: `string`; `finalUrl`: `string`; `mediaFormat`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `source`: `"video"` \| `"audio"`; `url`: `string`; \} \| \{ `bytes`: `number`; `chatAttachment`: [`ChatAttachment`](../../attachments/type-aliases/ChatAttachment.md); `contentType`: `string`; `finalUrl?`: `undefined`; `mediaFormat`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `source`: `"video"` \| `"audio"`; `url`: `string`; \}\>

Defined in: [packages/agent-sdk/src/tools/webfetch.ts:138](https://github.com/zocomputer/zov2-code/blob/ea621634e36cbd869fece8585e35d7f842c47a15/packages/agent-sdk/src/tools/webfetch.ts#L138)

Build the webfetch tool that fetches URLs, renders HTML to markdown, extracts documents, and queues media attachments.

## Parameters

### opts

#### attachAudioToChat?

`boolean`

Attach fetched audio. Same gating as video. Default false.

#### attachImagesToChat

`boolean`

#### attachVideoToChat?

`boolean`

Attach fetched video the way images attach — see `createReadTool`. Default false.

#### fetchImpl?

[`FetchLike`](../type-aliases/FetchLike.md)

Injectable for tests; defaults to global fetch.

#### imageUnavailableHint?

`string`

The "what to do instead" sentence in the image result note when the
pixels can't be delivered (attach disabled or over the size cap).
Defaults to asking the user to attach the image; agents without HITL
(e.g. task subagents) substitute advice that's actually actionable.

#### maxInlineImageBytes

`number`

#### maxInlineMediaBytes?

`number`

Max video/audio bytes to inline; the 5 MB response cap bites first.

#### spillDir

`string`

#### workspace

[`Workspace`](../interfaces/Workspace.md)

## Returns

`ToolDefinition`\<\{ `format?`: `"text"` \| `"markdown"` \| `"html"`; `timeout?`: `number`; `url`: `string`; \}, \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `format`: [`WebFetchFormat`](../type-aliases/WebFetchFormat.md); `note?`: `string`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `format`: [`WebFetchFormat`](../type-aliases/WebFetchFormat.md); `note?`: `string`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `pages`: `number`; `source`: `"pdf"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `pages`: `number`; `source`: `"pdf"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `source`: `"docx"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `source`: `"docx"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl`: `string`; `sheetFormat`: [`SheetFormat`](../type-aliases/SheetFormat.md); `sheets`: readonly [`SheetMeta`](../interfaces/SheetMeta.md)[]; `source`: `"sheet"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `content`: `string`; `contentType`: `string`; `finalUrl?`: `undefined`; `sheetFormat`: [`SheetFormat`](../type-aliases/SheetFormat.md); `sheets`: readonly [`SheetMeta`](../interfaces/SheetMeta.md)[]; `source`: `"sheet"`; `totalChars`: `number`; `truncated`: `boolean`; `url`: `string`; \} \| \{ `bytes`: `number`; `contentType`: `string`; `finalUrl`: `string`; `height`: `number` \| `null`; `imageFormat`: [`ImageFormat`](../type-aliases/ImageFormat.md); `note`: `string`; `source`: `"image"`; `url`: `string`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `contentType`: `string`; `finalUrl?`: `undefined`; `height`: `number` \| `null`; `imageFormat`: [`ImageFormat`](../type-aliases/ImageFormat.md); `note`: `string`; `source`: `"image"`; `url`: `string`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `chatAttachment`: \{ `dataUrl`: `string`; `filename`: `string`; `height`: `number` \| `null`; `kind`: `"image"`; `mediaType`: `string`; `width`: `number` \| `null`; \}; `contentType`: `string`; `finalUrl`: `string`; `height`: `number` \| `null`; `imageFormat`: [`ImageFormat`](../type-aliases/ImageFormat.md); `note`: `string`; `source`: `"image"`; `url`: `string`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `chatAttachment`: \{ `dataUrl`: `string`; `filename`: `string`; `height`: `number` \| `null`; `kind`: `"image"`; `mediaType`: `string`; `width`: `number` \| `null`; \}; `contentType`: `string`; `finalUrl?`: `undefined`; `height`: `number` \| `null`; `imageFormat`: [`ImageFormat`](../type-aliases/ImageFormat.md); `note`: `string`; `source`: `"image"`; `url`: `string`; `width`: `number` \| `null`; \} \| \{ `bytes`: `number`; `contentType`: `string`; `finalUrl`: `string`; `mediaFormat`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `source`: `"video"` \| `"audio"`; `url`: `string`; \} \| \{ `bytes`: `number`; `contentType`: `string`; `finalUrl?`: `undefined`; `mediaFormat`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `source`: `"video"` \| `"audio"`; `url`: `string`; \} \| \{ `bytes`: `number`; `chatAttachment`: [`ChatAttachment`](../../attachments/type-aliases/ChatAttachment.md); `contentType`: `string`; `finalUrl`: `string`; `mediaFormat`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `source`: `"video"` \| `"audio"`; `url`: `string`; \} \| \{ `bytes`: `number`; `chatAttachment`: [`ChatAttachment`](../../attachments/type-aliases/ChatAttachment.md); `contentType`: `string`; `finalUrl?`: `undefined`; `mediaFormat`: [`VideoFormat`](../type-aliases/VideoFormat.md) \| [`AudioFormat`](../type-aliases/AudioFormat.md); `mediaType`: `string`; `note`: `string`; `source`: `"video"` \| `"audio"`; `url`: `string`; \}\>
