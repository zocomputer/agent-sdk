[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / StateFilesHandle

# Interface: StateFilesHandle

Defined in: [packages/agent-sdk/src/state-files.ts:44](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/state-files.ts#L44)

Bearer-secret handle for direct object-store access.

`handleId`, `storeId`, `stateInstanceId`, `bucketName`, and `partition` are safe to log for
debugging. Never log the full object: `credentials.secretAccessKey` and
`credentials.sessionToken` grant temporary bucket access.

## Properties

### access

> `readonly` **access**: [`StateFilesAccess`](../type-aliases/StateFilesAccess.md)

Defined in: [packages/agent-sdk/src/state-files.ts:48](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/state-files.ts#L48)

***

### bucketName

> `readonly` **bucketName**: `string`

Defined in: [packages/agent-sdk/src/state-files.ts:53](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/state-files.ts#L53)

***

### credentials

> `readonly` **credentials**: [`StateFilesCredentials`](StateFilesCredentials.md)

Defined in: [packages/agent-sdk/src/state-files.ts:55](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/state-files.ts#L55)

***

### declarationName

> `readonly` **declarationName**: `string`

Defined in: [packages/agent-sdk/src/state-files.ts:46](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/state-files.ts#L46)

***

### endpoint

> `readonly` **endpoint**: `string`

Defined in: [packages/agent-sdk/src/state-files.ts:54](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/state-files.ts#L54)

***

### engine

> `readonly` **engine**: `"zo-blob-r2"`

Defined in: [packages/agent-sdk/src/state-files.ts:49](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/state-files.ts#L49)

***

### handleId

> `readonly` **handleId**: `string`

Defined in: [packages/agent-sdk/src/state-files.ts:45](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/state-files.ts#L45)

***

### interface

> `readonly` **interface**: `"files"`

Defined in: [packages/agent-sdk/src/state-files.ts:47](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/state-files.ts#L47)

***

### partition

> `readonly` **partition**: [`StateFilesPartition`](../type-aliases/StateFilesPartition.md)

Defined in: [packages/agent-sdk/src/state-files.ts:52](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/state-files.ts#L52)

***

### stateInstanceId

> `readonly` **stateInstanceId**: `string`

Defined in: [packages/agent-sdk/src/state-files.ts:51](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/state-files.ts#L51)

***

### storeId

> `readonly` **storeId**: `string`

Defined in: [packages/agent-sdk/src/state-files.ts:50](https://github.com/zocomputer/zov2-code/blob/1a1a37f3d58d0a8e082224aec255aec2ea7fce28/packages/agent-sdk/src/state-files.ts#L50)
