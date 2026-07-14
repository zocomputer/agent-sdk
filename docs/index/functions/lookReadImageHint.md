[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / lookReadImageHint

# Function: lookReadImageHint()

> **lookReadImageHint**(`oracle`): `string` \| `undefined`

Defined in: [packages/agent-sdk/src/tools/look.ts:359](https://github.com/zocomputer/zov2-code/blob/2480a6ef0f68d759f57bf84a8fcb14c879dd765d/packages/agent-sdk/src/tools/look.ts#L359)

`read`'s image-unavailable hint when a look oracle is wired: route to
`look` instead of the default "ask the user". `undefined` when the oracle
can't view images (the default hint stays honest).

## Parameters

### oracle

[`LookOracleConfig`](../interfaces/LookOracleConfig.md)

## Returns

`string` \| `undefined`
