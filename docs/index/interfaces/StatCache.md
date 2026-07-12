[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / StatCache

# Interface: StatCache\<T\>

Defined in: [packages/agent-sdk/src/extract/cache.ts:21](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/extract/cache.ts#L21)

A stat-validated memo for document extraction: keyed by path, validated by
mtime and size, insertion-ordered LRU. Failures are not cached; `compute`
throwing stores nothing.

## Type Parameters

### T

`T`

## Methods

### get()

> **get**(`key`, `id`, `compute`): `Promise`\<`T`\>

Defined in: [packages/agent-sdk/src/extract/cache.ts:27](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/extract/cache.ts#L27)

Get a cached value or compute and cache it. A hit whose stat identity
matches the provided one returns immediately; a miss or stale hit calls
`compute`, caches the result, and returns it.

#### Parameters

##### key

`string`

##### id

[`StatIdentity`](StatIdentity.md)

##### compute

() => `Promise`\<`T`\>

#### Returns

`Promise`\<`T`\>

***

### size()

> **size**(): `number`

Defined in: [packages/agent-sdk/src/extract/cache.ts:29](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/extract/cache.ts#L29)

Current entry count, for tests.

#### Returns

`number`
