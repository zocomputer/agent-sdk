[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / createStatCache

# Function: createStatCache()

> **createStatCache**\<`T`\>(`limit`): [`StatCache`](../interfaces/StatCache.md)\<`T`\>

Defined in: [packages/agent-sdk/src/extract/cache.ts:37](https://github.com/zocomputer/zov2-code/blob/fc4b6dd8dd680b4495b1f44b776f9a8d76104d40/packages/agent-sdk/src/extract/cache.ts#L37)

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
