[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / globToRegExp

# Function: globToRegExp()

> **globToRegExp**(`glob`): `RegExp`

Defined in: [packages/agent-sdk/src/glob-match.ts:2](https://github.com/zocomputer/zov2-code/blob/561b0153afcd985ff89c43386656aa6cb1d2502e/packages/agent-sdk/src/glob-match.ts#L2)

Convert a glob to an anchored RegExp over forward-slash paths. Double-star spans directories; single-star matches within a segment; question mark matches one char.

## Parameters

### glob

`string`

## Returns

`RegExp`
