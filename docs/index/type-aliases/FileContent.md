[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / FileContent

# Type Alias: FileContent

> **FileContent** = \{ `kind`: `"text"`; `text`: `string`; \} \| \{ `kind`: `"pdf"`; `pages`: `number`; `text`: `string`; \} \| \{ `kind`: `"docx"`; `text`: `string`; \} \| \{ `kind`: `"pptx"`; `slides`: `number`; `text`: `string`; \} \| \{ `kind`: `"odt"`; `text`: `string`; \} \| \{ `kind`: `"odp"`; `slides`: `number`; `text`: `string`; \} \| \{ `kind`: `"epub"`; `sections`: `number`; `text`: `string`; \} \| \{ `cells`: `number`; `kind`: `"ipynb"`; `text`: `string`; \} \| \{ `kind`: `"rtf"`; `text`: `string`; \} \| \{ `format`: [`SheetFormat`](SheetFormat.md); `kind`: `"sheet"`; `sheets`: readonly [`SheetMeta`](../interfaces/SheetMeta.md)[]; `text`: `string`; \} \| \{ `format`: [`ImageFormat`](ImageFormat.md); `height`: `number` \| `null`; `kind`: `"image"`; `width`: `number` \| `null`; \} \| \{ `format`: [`VideoFormat`](VideoFormat.md); `kind`: `"video"`; \} \| \{ `format`: [`AudioFormat`](AudioFormat.md); `kind`: `"audio"`; \}

Defined in: [packages/agent-sdk/src/read-file-content.ts:27](https://github.com/zocomputer/zov2-code/blob/af9677372192b613a9430e022ed9c3a186791633/packages/agent-sdk/src/read-file-content.ts#L27)

Content routed by detected file kind: text (native or extracted), image/video/audio metadata, or a thrown error for unsupported binaries.
