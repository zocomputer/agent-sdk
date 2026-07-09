[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / normalizeStateFilePath

# Function: normalizeStateFilePath()

> **normalizeStateFilePath**(`path`): `string`

Defined in: [packages/agent-sdk/src/state-files.ts:380](https://github.com/zocomputer/zov2-code/blob/c013587aa4ecd77d27b6774cf5b1fead3e0418d5/packages/agent-sdk/src/state-files.ts#L380)

Validates and normalizes a state-file path for S3 operations.
Throws if the path is empty, absolute, or contains invalid segments (`.`, `..`, or empty).

## Parameters

### path

`string`

## Returns

`string`
