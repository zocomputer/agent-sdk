[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / TextEncoding

# Type Alias: TextEncoding

> **TextEncoding** = `"utf8"` \| `"utf16le"` \| `"utf16be"`

Defined in: [packages/agent-sdk/src/file-kind.ts:61](https://github.com/zocomputer/zov2-code/blob/2f680aef81cf6a147ceac91fe4d066f3e4aff1b6/packages/agent-sdk/src/file-kind.ts#L61)

Text encodings `read` decodes. UTF-16 is BOM-detected (a NUL-sniff alone
would misclassify UTF-16 text — common in Windows-exported CSVs — as binary).
