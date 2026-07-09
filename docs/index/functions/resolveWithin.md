[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / resolveWithin

# Function: resolveWithin()

> **resolveWithin**(`root`, `path`): `string`

Defined in: [packages/agent-sdk/src/workspace.ts:11](https://github.com/zocomputer/zov2-code/blob/8718aaa2765d9af21ff0cbb162dec35286dbcb11/packages/agent-sdk/src/workspace.ts#L11)

Resolve `path` against `root` and refuse anything that escapes it. Relative
paths resolve from `root`; an absolute path must already sit inside it.

## Parameters

### root

`string`

### path

`string`

## Returns

`string`
