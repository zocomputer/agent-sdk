[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / openZip

# Function: openZip()

> **openZip**(`buffer`): [`ZipArchive`](../interfaces/ZipArchive.md)

Defined in: [packages/agent-sdk/src/extract/zip.ts:66](https://github.com/zocomputer/zov2-code/blob/9d3f4b0b6ac2b9a8a8d1307a4590af07d0d7978f/packages/agent-sdk/src/extract/zip.ts#L66)

Parse a ZIP archive from a whole-file buffer. Throws when the buffer is
not a readable archive; entry decompression is lazy (see
[ZipArchive.read](../interfaces/ZipArchive.md#read)).

## Parameters

### buffer

`Buffer`

## Returns

[`ZipArchive`](../interfaces/ZipArchive.md)
