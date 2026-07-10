[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / lookAvKindClause

# Function: lookAvKindClause()

> **lookAvKindClause**(`caps`): `string` \| `undefined`

Defined in: [packages/agent-sdk/src/tools/look.ts:368](https://github.com/zocomputer/zov2-code/blob/4567e46fc689740ed814c3b4b8b1101dff80bfbe/packages/agent-sdk/src/tools/look.ts#L368)

The "if it is …" clause naming exactly the AV kinds the oracle takes, or
`undefined` when it takes neither. read/webfetch share ONE
`mediaUnavailableHint` string across video and audio results, so a
one-kind oracle's hint must scope its look clause to that kind — an
unconditional "pass it to look" would steer the other kind into look's
refusal.

## Parameters

### caps

[`ModelInputCapabilities`](../interfaces/ModelInputCapabilities.md)

## Returns

`string` \| `undefined`
