[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / TextEncoding

# Type Alias: TextEncoding

> **TextEncoding** = `"utf8"` \| `"utf16le"` \| `"utf16be"`

Defined in: [packages/agent-sdk/src/file-kind.ts:61](https://github.com/zocomputer/zov2-code/blob/8ddca74b7284f16fe6a147e3eb2a55bed9838617/packages/agent-sdk/src/file-kind.ts#L61)

Text encodings `read` decodes. UTF-16 is BOM-detected (a NUL-sniff alone
would misclassify UTF-16 text — common in Windows-exported CSVs — as binary).
