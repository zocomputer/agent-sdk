[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / loadFileContent

# Function: loadFileContent()

> **loadFileContent**(`buffer`, `path`, `id`): `Promise`\<[`FileContent`](../type-aliases/FileContent.md)\>

Defined in: [packages/agent-sdk/src/read-file-content.ts:154](https://github.com/zocomputer/zov2-code/blob/ea094c0d7d3efd4351c48b5c1bd38d95a1836e8d/packages/agent-sdk/src/read-file-content.ts#L154)

Route a file's bytes to renderable content. `path` labels error messages,
disambiguates container formats by extension, and keys the extraction cache.
Throws for binaries with no text rendering (the tool-error path).

## Parameters

### buffer

`Buffer`

### path

`string`

### id

[`StatIdentity`](../interfaces/StatIdentity.md)

## Returns

`Promise`\<[`FileContent`](../type-aliases/FileContent.md)\>
