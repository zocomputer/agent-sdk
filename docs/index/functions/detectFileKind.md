[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / detectFileKind

# Function: detectFileKind()

> **detectFileKind**(`buf`, `path`): [`FileKind`](../type-aliases/FileKind.md)

Defined in: [packages/agent-sdk/src/file-kind.ts:232](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/file-kind.ts#L232)

Classify a file by its magic bytes and path. Magic bytes decide the family; the path disambiguates containers.

## Parameters

### buf

`Buffer`

### path

`string`

## Returns

[`FileKind`](../type-aliases/FileKind.md)
