[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / parseSearchOutput

# Function: parseSearchOutput()

> **parseSearchOutput**(`stdout`, `maxMatches`, `flooded?`): [`IoSearchResult`](../interfaces/IoSearchResult.md)

Defined in: [packages/agent-sdk/src/sandbox-io.ts:411](https://github.com/zocomputer/zov2-code/blob/178825142421d42c04f57b0afbc80612a16fe4c6/packages/agent-sdk/src/sandbox-io.ts#L411)

Parse `file:line:text` search output into matches, enforcing the total
bound. Reaching the bound (or a `flooded` byte-capped stream) marks the
scan stopped — more matches may exist past the cap, exactly like the
local backend stopping its scan.

## Parameters

### stdout

`string`

### maxMatches

`number`

### flooded?

`boolean` = `false`

## Returns

[`IoSearchResult`](../interfaces/IoSearchResult.md)
