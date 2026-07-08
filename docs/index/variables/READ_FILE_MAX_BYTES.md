[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / READ\_FILE\_MAX\_BYTES

# Variable: READ\_FILE\_MAX\_BYTES

> `const` **READ\_FILE\_MAX\_BYTES**: `10000000` = `10_000_000`

Defined in: [packages/agent-sdk/src/file-view.ts:18](https://github.com/zocomputer/zov2-code/blob/a8636edc2f6184e686ebe291b26c3e5e9b3ae7ef/packages/agent-sdk/src/file-view.ts#L18)

`read` refuses files bigger than this outright (stat guard — the file is
never read); the model is steered to bash for surgical extraction.
