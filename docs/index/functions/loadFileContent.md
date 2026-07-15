[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / loadFileContent

# Function: loadFileContent()

> **loadFileContent**(`buffer`, `path`, `id`): `Promise`\<[`FileContent`](../type-aliases/FileContent.md)\>

Defined in: [packages/agent-sdk/src/read-file-content.ts:154](https://github.com/zocomputer/zov2-code/blob/8ddca74b7284f16fe6a147e3eb2a55bed9838617/packages/agent-sdk/src/read-file-content.ts#L154)

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
