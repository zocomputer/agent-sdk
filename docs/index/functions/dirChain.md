[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / dirChain

# Function: dirChain()

> **dirChain**(`relPath`): `string`[]

Defined in: [packages/agent-sdk/src/dir-conventions.ts:98](https://github.com/zocomputer/zov2-code/blob/07721c227b11c8cc8115ab6c09048e903415a342/packages/agent-sdk/src/dir-conventions.ts#L98)

The directory chain a read of `relPath` passes through, shallow → deep,
excluding the workspace root itself. Accepts `/` or `\` separators and
returns `/`-joined entries. Pure; exported for tests.

## Parameters

### relPath

`string`

## Returns

`string`[]
