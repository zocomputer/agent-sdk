[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / lookFetchedMediaHint

# Function: lookFetchedMediaHint()

> **lookFetchedMediaHint**(`oracle`): `string` \| `undefined`

Defined in: [packages/agent-sdk/src/tools/look.ts:413](https://github.com/zocomputer/zov2-code/blob/48650141bb7b851495928e6463ae438988b79a49/packages/agent-sdk/src/tools/look.ts#L413)

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
