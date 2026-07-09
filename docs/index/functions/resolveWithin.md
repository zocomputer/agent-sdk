[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / resolveWithin

# Function: resolveWithin()

> **resolveWithin**(`root`, `path`): `string`

Defined in: [packages/agent-sdk/src/workspace.ts:11](https://github.com/zocomputer/zov2-code/blob/f16d57089a60328b9900d1483bcd363cd844b8b3/packages/agent-sdk/src/workspace.ts#L11)

Resolve `path` against `root` and refuse anything that escapes it. Relative
paths resolve from `root`; an absolute path must already sit inside it.

## Parameters

### root

`string`

### path

`string`

## Returns

`string`
