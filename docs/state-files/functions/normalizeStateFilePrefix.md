[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / normalizeStateFilePrefix

# Function: normalizeStateFilePrefix()

> **normalizeStateFilePrefix**(`prefix`): `string` \| `undefined`

Defined in: [packages/agent-sdk/src/state-files.ts:380](https://github.com/zocomputer/zov2-code/blob/56f3348e42f7f39e91ab5519d5b5feb8988805e9/packages/agent-sdk/src/state-files.ts#L380)

Validates and normalizes a state-file prefix for list operations.
Returns `undefined` for empty/undefined input; ensures trailing slash for directory-style prefixes.

## Parameters

### prefix

`string` \| `undefined`

## Returns

`string` \| `undefined`
