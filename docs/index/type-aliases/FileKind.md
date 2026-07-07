[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / FileKind

# Type Alias: FileKind

> **FileKind** = \{ `encoding`: [`TextEncoding`](TextEncoding.md); `kind`: `"text"`; \} \| \{ `kind`: `"pdf"`; \} \| \{ `kind`: `"docx"`; \} \| \{ `format`: [`SheetFormat`](SheetFormat.md); `kind`: `"sheet"`; \} \| \{ `format`: [`ImageFormat`](ImageFormat.md); `kind`: `"image"`; \} \| \{ `format`: [`VideoFormat`](VideoFormat.md); `kind`: `"video"`; \} \| \{ `format`: [`AudioFormat`](AudioFormat.md); `kind`: `"audio"`; \} \| \{ `description`: `string`; `kind`: `"binary"`; \}

Defined in: [packages/agent-sdk/src/file-kind.ts:64](https://github.com/zocomputer/zov2-code/blob/df4b939a34db36cf82bffe0187f8c98f4e308c18/packages/agent-sdk/src/file-kind.ts#L64)

File classification by magic bytes and structure, driving read-tool content routing.
