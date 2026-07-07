[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / resolveWithin

# Function: resolveWithin()

> **resolveWithin**(`root`, `path`): `string`

Defined in: [packages/agent-sdk/src/workspace.ts:11](https://github.com/zocomputer/zov2-code/blob/df4b939a34db36cf82bffe0187f8c98f4e308c18/packages/agent-sdk/src/workspace.ts#L11)

Resolve `path` against `root` and refuse anything that escapes it. Relative
paths resolve from `root`; an absolute path must already sit inside it.

## Parameters

### root

`string`

### path

`string`

## Returns

`string`
