[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / ZipArchive

# Interface: ZipArchive

Defined in: [packages/agent-sdk/src/extract/zip.ts:33](https://github.com/zocomputer/zov2-code/blob/2c62d8b884523ef65360fa00bdaffe3cdda99189/packages/agent-sdk/src/extract/zip.ts#L33)

A parsed ZIP archive: entry names in central-directory order, plus lazy
per-entry decompression. Produced by [openZip](../functions/openZip.md).

## Properties

### names

> `readonly` **names**: readonly `string`[]

Defined in: [packages/agent-sdk/src/extract/zip.ts:35](https://github.com/zocomputer/zov2-code/blob/2c62d8b884523ef65360fa00bdaffe3cdda99189/packages/agent-sdk/src/extract/zip.ts#L35)

Entry names (directory entries excluded), in central-directory order.

## Methods

### has()

> **has**(`name`): `boolean`

Defined in: [packages/agent-sdk/src/extract/zip.ts:37](https://github.com/zocomputer/zov2-code/blob/2c62d8b884523ef65360fa00bdaffe3cdda99189/packages/agent-sdk/src/extract/zip.ts#L37)

Whether the archive contains the named entry.

#### Parameters

##### name

`string`

#### Returns

`boolean`

***

### read()

> **read**(`name`): `Buffer`

Defined in: [packages/agent-sdk/src/extract/zip.ts:44](https://github.com/zocomputer/zov2-code/blob/2c62d8b884523ef65360fa00bdaffe3cdda99189/packages/agent-sdk/src/extract/zip.ts#L44)

Decompress one entry. Returns `null` for a name the archive doesn't
carry; throws for entries this reader can't decode (encryption, an
unsupported compression method, a corrupt local header) with a message
naming the problem.

#### Parameters

##### name

`string`

#### Returns

`Buffer`
