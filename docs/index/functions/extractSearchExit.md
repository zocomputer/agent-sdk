[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / extractSearchExit

# Function: extractSearchExit()

> **extractSearchExit**(`stdout`): `object`

Defined in: [packages/agent-sdk/src/sandbox-io.ts:305](https://github.com/zocomputer/zov2-code/blob/f537e0a90da222390e69bcbf7e329142b9e8d4b0/packages/agent-sdk/src/sandbox-io.ts#L305)

Split a search's stdout from its trailing exit sentinel. Exported for
tests. `exitCode: null` = sentinel missing (output was cut by the cap, or
the shell never ran the wrapped block).

## Parameters

### stdout

`string`

## Returns

`object`

### exitCode

> **exitCode**: `number` \| `null`

### stdout

> **stdout**: `string`
