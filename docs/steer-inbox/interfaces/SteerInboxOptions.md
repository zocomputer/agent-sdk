[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [steer-inbox](../README.md) / SteerInboxOptions

# Interface: SteerInboxOptions

Defined in: [packages/agent-sdk/src/steer-inbox.ts:20](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/steer-inbox.ts#L20)

Options for creating a steer inbox that manages steered messages per session.

## Properties

### dir

> **dir**: `string`

Defined in: [packages/agent-sdk/src/steer-inbox.ts:22](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/steer-inbox.ts#L22)

Directory holding the per-session inbox files (created on first append).

***

### newId?

> `optional` **newId?**: () => `string`

Defined in: [packages/agent-sdk/src/steer-inbox.ts:26](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/steer-inbox.ts#L26)

Injectable id source for tests; defaults to `crypto.randomUUID`.

#### Returns

`string`

***

### now?

> `optional` **now?**: () => `number`

Defined in: [packages/agent-sdk/src/steer-inbox.ts:24](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/steer-inbox.ts#L24)

Injectable clock for tests; defaults to `Date.now`.

#### Returns

`number`

***

### readFile?

> `optional` **readFile?**: (`path`) => `string`

Defined in: [packages/agent-sdk/src/steer-inbox.ts:28](https://github.com/zocomputer/zov2-code/blob/61dc346b545160acfebf6cc02d8729e8a18c78ba/packages/agent-sdk/src/steer-inbox.ts#L28)

Injectable file reader for tests (drain's failure path); defaults to `readFileSync`.

#### Parameters

##### path

`string`

#### Returns

`string`
