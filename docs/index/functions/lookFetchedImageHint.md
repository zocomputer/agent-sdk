[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / lookFetchedImageHint

# Function: lookFetchedImageHint()

> **lookFetchedImageHint**(`oracle`): `string` \| `undefined`

Defined in: [packages/agent-sdk/src/tools/look.ts:395](https://github.com/zocomputer/zov2-code/blob/63d0e014c421616ce0383b99e59109da774eac14/packages/agent-sdk/src/tools/look.ts#L395)

`webfetch`'s image-unavailable hint when a look oracle is wired: the image
is at a URL (look takes workspace paths), so the route is download-then-look.
`undefined` when the oracle can't view images.

## Parameters

### oracle

[`LookOracleConfig`](../interfaces/LookOracleConfig.md)

## Returns

`string` \| `undefined`
