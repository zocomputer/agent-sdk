[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / detectFileKind

# Function: detectFileKind()

> **detectFileKind**(`buf`, `path`): [`FileKind`](../type-aliases/FileKind.md)

Defined in: [packages/agent-sdk/src/file-kind.ts:232](https://github.com/zocomputer/zov2-code/blob/d15edc03b49c31d0244c34c64095ce9b88216fe1/packages/agent-sdk/src/file-kind.ts#L232)

Classify a file by its magic bytes and path. Magic bytes decide the family; the path disambiguates containers.

## Parameters

### buf

`Buffer`

### path

`string`

## Returns

[`FileKind`](../type-aliases/FileKind.md)
