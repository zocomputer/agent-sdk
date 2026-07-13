[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / globToRegExp

# Function: globToRegExp()

> **globToRegExp**(`glob`): `RegExp`

Defined in: [packages/agent-sdk/src/glob-match.ts:2](https://github.com/zocomputer/zov2-code/blob/2f680aef81cf6a147ceac91fe4d066f3e4aff1b6/packages/agent-sdk/src/glob-match.ts#L2)

Convert a glob to an anchored RegExp over forward-slash paths. Double-star spans directories; single-star matches within a segment; question mark matches one char.

## Parameters

### glob

`string`

## Returns

`RegExp`
