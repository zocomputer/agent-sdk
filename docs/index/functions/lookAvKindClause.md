[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / lookAvKindClause

# Function: lookAvKindClause()

> **lookAvKindClause**(`caps`): `string` \| `undefined`

Defined in: [packages/agent-sdk/src/tools/look.ts:372](https://github.com/zocomputer/zov2-code/blob/344fef7287e3cdac215bfeba4bb54fc2101e5e6e/packages/agent-sdk/src/tools/look.ts#L372)

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
