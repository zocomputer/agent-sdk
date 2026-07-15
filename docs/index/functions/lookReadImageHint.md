[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / lookReadImageHint

# Function: lookReadImageHint()

> **lookReadImageHint**(`oracle`): `string` \| `undefined`

Defined in: [packages/agent-sdk/src/tools/look.ts:359](https://github.com/zocomputer/zov2-code/blob/1e681aac14f2dac158459843dc60bdd734625bf0/packages/agent-sdk/src/tools/look.ts#L359)

`read`'s image-unavailable hint when a look oracle is wired: route to
`look` instead of the default "ask the user". `undefined` when the oracle
can't view images (the default hint stays honest).

## Parameters

### oracle

[`LookOracleConfig`](../interfaces/LookOracleConfig.md)

## Returns

`string` \| `undefined`
