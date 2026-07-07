[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / normalizeStateFilePrefix

# Function: normalizeStateFilePrefix()

> **normalizeStateFilePrefix**(`prefix`): `string` \| `undefined`

Defined in: [packages/agent-sdk/src/state-files.ts:380](https://github.com/zocomputer/zov2-code/blob/92a3d351e1799d1814d68c9b8b478ce63ec2feb9/packages/agent-sdk/src/state-files.ts#L380)

Validates and normalizes a state-file prefix for list operations.
Returns `undefined` for empty/undefined input; ensures trailing slash for directory-style prefixes.

## Parameters

### prefix

`string` \| `undefined`

## Returns

`string` \| `undefined`
