[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / lookFetchedImageHint

# Function: lookFetchedImageHint()

> **lookFetchedImageHint**(`oracle`): `string` \| `undefined`

Defined in: [packages/agent-sdk/src/tools/look.ts:395](https://github.com/zocomputer/zov2-code/blob/1201055c5cc9e558bf15b3fd953dc08102ba49af/packages/agent-sdk/src/tools/look.ts#L395)

`webfetch`'s image-unavailable hint when a look oracle is wired: the image
is at a URL (look takes workspace paths), so the route is download-then-look.
`undefined` when the oracle can't view images.

## Parameters

### oracle

[`LookOracleConfig`](../interfaces/LookOracleConfig.md)

## Returns

`string` \| `undefined`
