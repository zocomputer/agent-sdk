[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / lookFetchedMediaHint

# Function: lookFetchedMediaHint()

> **lookFetchedMediaHint**(`oracle`): `string` \| `undefined`

Defined in: [packages/agent-sdk/src/tools/look.ts:407](https://github.com/zocomputer/zov2-code/blob/9538a0a8ac4443391049ca02b620175fec05d4cd/packages/agent-sdk/src/tools/look.ts#L407)

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
