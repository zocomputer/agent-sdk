[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / openZip

# Function: openZip()

> **openZip**(`buffer`): [`ZipArchive`](../interfaces/ZipArchive.md)

Defined in: [packages/agent-sdk/src/extract/zip.ts:66](https://github.com/zocomputer/zov2-code/blob/a8636edc2f6184e686ebe291b26c3e5e9b3ae7ef/packages/agent-sdk/src/extract/zip.ts#L66)

Parse a ZIP archive from a whole-file buffer. Throws when the buffer is
not a readable archive; entry decompression is lazy (see
[ZipArchive.read](../interfaces/ZipArchive.md#read)).

## Parameters

### buffer

`Buffer`

## Returns

[`ZipArchive`](../interfaces/ZipArchive.md)
