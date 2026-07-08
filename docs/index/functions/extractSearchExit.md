[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / extractSearchExit

# Function: extractSearchExit()

> **extractSearchExit**(`stdout`): `object`

Defined in: [packages/agent-sdk/src/sandbox-io.ts:282](https://github.com/zocomputer/zov2-code/blob/a8636edc2f6184e686ebe291b26c3e5e9b3ae7ef/packages/agent-sdk/src/sandbox-io.ts#L282)

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
