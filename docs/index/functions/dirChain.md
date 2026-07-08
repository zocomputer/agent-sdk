[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / dirChain

# Function: dirChain()

> **dirChain**(`relPath`): `string`[]

Defined in: [packages/agent-sdk/src/dir-conventions.ts:98](https://github.com/zocomputer/zov2-code/blob/0bb195a93a5e8bd5814dac23311408353312bc4f/packages/agent-sdk/src/dir-conventions.ts#L98)

The directory chain a read of `relPath` passes through, shallow → deep,
excluding the workspace root itself. Accepts `/` or `\` separators and
returns `/`-joined entries. Pure; exported for tests.

## Parameters

### relPath

`string`

## Returns

`string`[]
