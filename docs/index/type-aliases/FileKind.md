[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / FileKind

# Type Alias: FileKind

> **FileKind** = \{ `encoding`: [`TextEncoding`](TextEncoding.md); `kind`: `"text"`; \} \| \{ `kind`: `"pdf"`; \} \| \{ `kind`: `"docx"`; \} \| \{ `kind`: `"pptx"`; \} \| \{ `kind`: `"odt"`; \} \| \{ `kind`: `"odp"`; \} \| \{ `kind`: `"epub"`; \} \| \{ `kind`: `"ipynb"`; \} \| \{ `kind`: `"rtf"`; \} \| \{ `format`: [`SheetFormat`](SheetFormat.md); `kind`: `"sheet"`; \} \| \{ `format`: [`ImageFormat`](ImageFormat.md); `kind`: `"image"`; \} \| \{ `format`: [`VideoFormat`](VideoFormat.md); `kind`: `"video"`; \} \| \{ `format`: [`AudioFormat`](AudioFormat.md); `kind`: `"audio"`; \} \| \{ `description`: `string`; `kind`: `"binary"`; \}

Defined in: [packages/agent-sdk/src/file-kind.ts:64](https://github.com/zocomputer/zov2-code/blob/2f6c8cc3fd1672c6cd6d12c28dbf229ac82949b0/packages/agent-sdk/src/file-kind.ts#L64)

File classification by magic bytes and structure, driving read-tool content routing.
