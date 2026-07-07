[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / FileContent

# Type Alias: FileContent

> **FileContent** = \{ `kind`: `"text"`; `text`: `string`; \} \| \{ `kind`: `"pdf"`; `pages`: `number`; `text`: `string`; \} \| \{ `kind`: `"docx"`; `text`: `string`; \} \| \{ `format`: [`SheetFormat`](SheetFormat.md); `kind`: `"sheet"`; `sheets`: readonly [`SheetMeta`](../interfaces/SheetMeta.md)[]; `text`: `string`; \} \| \{ `format`: [`ImageFormat`](ImageFormat.md); `height`: `number` \| `null`; `kind`: `"image"`; `width`: `number` \| `null`; \} \| \{ `format`: [`VideoFormat`](VideoFormat.md); `kind`: `"video"`; \} \| \{ `format`: [`AudioFormat`](AudioFormat.md); `kind`: `"audio"`; \}

Defined in: [packages/agent-sdk/src/read-file-content.ts:22](https://github.com/zocomputer/zov2-code/blob/ea2754383255c8c5c02ffe9d50fe4b5dbea37395/packages/agent-sdk/src/read-file-content.ts#L22)

Content routed by detected file kind: text (native or extracted), image/video/audio metadata, or a thrown error for unsupported binaries.
