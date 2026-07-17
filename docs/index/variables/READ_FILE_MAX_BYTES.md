[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / READ\_FILE\_MAX\_BYTES

# Variable: READ\_FILE\_MAX\_BYTES

> `const` **READ\_FILE\_MAX\_BYTES**: `10000000` = `10_000_000`

Defined in: [packages/agent-sdk/src/file-view.ts:18](https://github.com/zocomputer/zov2-code/blob/178825142421d42c04f57b0afbc80612a16fe4c6/packages/agent-sdk/src/file-view.ts#L18)

`read` refuses files bigger than this outright (stat guard — the file is
never read); the model is steered to bash for surgical extraction.
