[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createStatCache

# Function: createStatCache()

> **createStatCache**\<`T`\>(`limit`): [`StatCache`](../interfaces/StatCache.md)\<`T`\>

Defined in: [packages/agent-sdk/src/extract/cache.ts:37](https://github.com/zocomputer/zov2-code/blob/df4b939a34db36cf82bffe0187f8c98f4e308c18/packages/agent-sdk/src/extract/cache.ts#L37)

Build a stat-validated extraction cache with the given entry limit. LRU
eviction when full; Map iteration order is insertion order, so the first
entry is the oldest.

## Type Parameters

### T

`T`

## Parameters

### limit

`number`

## Returns

[`StatCache`](../interfaces/StatCache.md)\<`T`\>
