[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / READ\_FILE\_MAX\_BYTES

# Variable: READ\_FILE\_MAX\_BYTES

> `const` **READ\_FILE\_MAX\_BYTES**: `10000000` = `10_000_000`

Defined in: [packages/agent-sdk/src/file-view.ts:18](https://github.com/zocomputer/zov2-code/blob/aba140d6dd71d0ea05075bf6e9ebcc5739f7a7b3/packages/agent-sdk/src/file-view.ts#L18)

`read` refuses files bigger than this outright (stat guard — the file is
never read); the model is steered to bash for surgical extraction.
