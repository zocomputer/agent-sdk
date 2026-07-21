[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / CreateRefreshingStateFilesClientOptions

# Interface: CreateRefreshingStateFilesClientOptions

Defined in: [packages/agent-sdk/src/state-files.ts:291](https://github.com/zocomputer/zov2-code/blob/48650141bb7b851495928e6463ae438988b79a49/packages/agent-sdk/src/state-files.ts#L291)

Options for creating a state-files client that auto-refreshes expiring handles.

## Properties

### loadHandle

> `readonly` **loadHandle**: () => `Promise`\<[`StateFilesHandle`](StateFilesHandle.md)\>

Defined in: [packages/agent-sdk/src/state-files.ts:293](https://github.com/zocomputer/zov2-code/blob/48650141bb7b851495928e6463ae438988b79a49/packages/agent-sdk/src/state-files.ts#L293)

Loads a fresh handle when the current one is near expiration.

#### Returns

`Promise`\<[`StateFilesHandle`](StateFilesHandle.md)\>

***

### now?

> `readonly` `optional` **now?**: () => `Date`

Defined in: [packages/agent-sdk/src/state-files.ts:296](https://github.com/zocomputer/zov2-code/blob/48650141bb7b851495928e6463ae438988b79a49/packages/agent-sdk/src/state-files.ts#L296)

Returns the current time. Defaults to `() => new Date()`. Inject for testing.

#### Returns

`Date`

***

### refreshWindowMs?

> `readonly` `optional` **refreshWindowMs?**: `number`

Defined in: [packages/agent-sdk/src/state-files.ts:298](https://github.com/zocomputer/zov2-code/blob/48650141bb7b851495928e6463ae438988b79a49/packages/agent-sdk/src/state-files.ts#L298)

Reload when the handle expires within this window. Defaults to 60 seconds.

***

### s3

> `readonly` **s3**: [`StateFilesS3Client`](StateFilesS3Client.md)

Defined in: [packages/agent-sdk/src/state-files.ts:294](https://github.com/zocomputer/zov2-code/blob/48650141bb7b851495928e6463ae438988b79a49/packages/agent-sdk/src/state-files.ts#L294)
