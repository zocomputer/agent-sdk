[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / CreateRefreshingStateFilesClientOptions

# Interface: CreateRefreshingStateFilesClientOptions

Defined in: [packages/agent-sdk/src/state-files.ts:268](https://github.com/zocomputer/zov2-code/blob/ea621634e36cbd869fece8585e35d7f842c47a15/packages/agent-sdk/src/state-files.ts#L268)

Options for creating a state-files client that auto-refreshes expiring handles.

## Properties

### loadHandle

> `readonly` **loadHandle**: () => `Promise`\<[`StateFilesHandle`](StateFilesHandle.md)\>

Defined in: [packages/agent-sdk/src/state-files.ts:270](https://github.com/zocomputer/zov2-code/blob/ea621634e36cbd869fece8585e35d7f842c47a15/packages/agent-sdk/src/state-files.ts#L270)

Loads a fresh handle when the current one is near expiration.

#### Returns

`Promise`\<[`StateFilesHandle`](StateFilesHandle.md)\>

***

### now?

> `readonly` `optional` **now?**: () => `Date`

Defined in: [packages/agent-sdk/src/state-files.ts:273](https://github.com/zocomputer/zov2-code/blob/ea621634e36cbd869fece8585e35d7f842c47a15/packages/agent-sdk/src/state-files.ts#L273)

Returns the current time. Defaults to `() => new Date()`. Inject for testing.

#### Returns

`Date`

***

### refreshWindowMs?

> `readonly` `optional` **refreshWindowMs?**: `number`

Defined in: [packages/agent-sdk/src/state-files.ts:275](https://github.com/zocomputer/zov2-code/blob/ea621634e36cbd869fece8585e35d7f842c47a15/packages/agent-sdk/src/state-files.ts#L275)

Reload when the handle expires within this window. Defaults to 60 seconds.

***

### s3

> `readonly` **s3**: [`StateFilesS3Client`](StateFilesS3Client.md)

Defined in: [packages/agent-sdk/src/state-files.ts:271](https://github.com/zocomputer/zov2-code/blob/ea621634e36cbd869fece8585e35d7f842c47a15/packages/agent-sdk/src/state-files.ts#L271)
