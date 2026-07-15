[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createStatCache

# Function: createStatCache()

> **createStatCache**\<`T`\>(`limit`): [`StatCache`](../interfaces/StatCache.md)\<`T`\>

Defined in: [packages/agent-sdk/src/extract/cache.ts:37](https://github.com/zocomputer/zov2-code/blob/ea094c0d7d3efd4351c48b5c1bd38d95a1836e8d/packages/agent-sdk/src/extract/cache.ts#L37)

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
