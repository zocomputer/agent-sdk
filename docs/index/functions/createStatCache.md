[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createStatCache

# Function: createStatCache()

> **createStatCache**\<`T`\>(`limit`): [`StatCache`](../interfaces/StatCache.md)\<`T`\>

Defined in: [packages/agent-sdk/src/extract/cache.ts:37](https://github.com/zocomputer/zov2-code/blob/ff98edef5b507bf96c80f8f4c36882d827c8a81e/packages/agent-sdk/src/extract/cache.ts#L37)

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
