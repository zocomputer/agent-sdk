[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / normalizeStateFilePath

# Function: normalizeStateFilePath()

> **normalizeStateFilePath**(`path`): `string`

Defined in: [packages/agent-sdk/src/state-files.ts:380](https://github.com/zocomputer/zov2-code/blob/440b57200b266cf1c7309b270db9220db760c77a/packages/agent-sdk/src/state-files.ts#L380)

Validates and normalizes a state-file path for S3 operations.
Throws if the path is empty, absolute, or contains invalid segments (`.`, `..`, or empty).

## Parameters

### path

`string`

## Returns

`string`
