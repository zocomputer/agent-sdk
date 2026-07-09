[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / lookFetchedMediaHint

# Function: lookFetchedMediaHint()

> **lookFetchedMediaHint**(`oracle`): `string` \| `undefined`

Defined in: [packages/agent-sdk/src/tools/look.ts:403](https://github.com/zocomputer/zov2-code/blob/a259f6f3d345009ac90c86d9f10d9171b99736b9/packages/agent-sdk/src/tools/look.ts#L403)

`webfetch`'s video/audio-unavailable hint when a look oracle is wired —
download-then-look, like [lookFetchedImageHint](lookFetchedImageHint.md), with the look
clause scoped to the kinds the oracle actually takes
([lookAvKindClause](lookAvKindClause.md)) and the bash extraction fallback kept for the
rest. `undefined` when the oracle views neither video nor audio.

## Parameters

### oracle

[`LookOracleConfig`](../interfaces/LookOracleConfig.md)

## Returns

`string` \| `undefined`
