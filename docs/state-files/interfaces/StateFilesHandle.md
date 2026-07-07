[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / StateFilesHandle

# Interface: StateFilesHandle

Defined in: [packages/agent-sdk/src/state-files.ts:38](https://github.com/zocomputer/zov2-code/blob/ce93d09ec2812425a1522360ec5d53274fce9d8d/packages/agent-sdk/src/state-files.ts#L38)

Bearer-secret handle for direct object-store access.

`handleId`, `storeId`, `stateInstanceId`, `bucketName`, and `partition` are safe to log for
debugging. Never log the full object: `credentials.secretAccessKey` and
`credentials.sessionToken` grant temporary bucket access.

## Properties

### access

> `readonly` **access**: [`StateFilesAccess`](../type-aliases/StateFilesAccess.md)

Defined in: [packages/agent-sdk/src/state-files.ts:42](https://github.com/zocomputer/zov2-code/blob/ce93d09ec2812425a1522360ec5d53274fce9d8d/packages/agent-sdk/src/state-files.ts#L42)

***

### bucketName

> `readonly` **bucketName**: `string`

Defined in: [packages/agent-sdk/src/state-files.ts:47](https://github.com/zocomputer/zov2-code/blob/ce93d09ec2812425a1522360ec5d53274fce9d8d/packages/agent-sdk/src/state-files.ts#L47)

***

### credentials

> `readonly` **credentials**: [`StateFilesCredentials`](StateFilesCredentials.md)

Defined in: [packages/agent-sdk/src/state-files.ts:49](https://github.com/zocomputer/zov2-code/blob/ce93d09ec2812425a1522360ec5d53274fce9d8d/packages/agent-sdk/src/state-files.ts#L49)

***

### declarationName

> `readonly` **declarationName**: `string`

Defined in: [packages/agent-sdk/src/state-files.ts:40](https://github.com/zocomputer/zov2-code/blob/ce93d09ec2812425a1522360ec5d53274fce9d8d/packages/agent-sdk/src/state-files.ts#L40)

***

### endpoint

> `readonly` **endpoint**: `string`

Defined in: [packages/agent-sdk/src/state-files.ts:48](https://github.com/zocomputer/zov2-code/blob/ce93d09ec2812425a1522360ec5d53274fce9d8d/packages/agent-sdk/src/state-files.ts#L48)

***

### engine

> `readonly` **engine**: `"zo-blob-r2"`

Defined in: [packages/agent-sdk/src/state-files.ts:43](https://github.com/zocomputer/zov2-code/blob/ce93d09ec2812425a1522360ec5d53274fce9d8d/packages/agent-sdk/src/state-files.ts#L43)

***

### handleId

> `readonly` **handleId**: `string`

Defined in: [packages/agent-sdk/src/state-files.ts:39](https://github.com/zocomputer/zov2-code/blob/ce93d09ec2812425a1522360ec5d53274fce9d8d/packages/agent-sdk/src/state-files.ts#L39)

***

### interface

> `readonly` **interface**: `"files"`

Defined in: [packages/agent-sdk/src/state-files.ts:41](https://github.com/zocomputer/zov2-code/blob/ce93d09ec2812425a1522360ec5d53274fce9d8d/packages/agent-sdk/src/state-files.ts#L41)

***

### partition

> `readonly` **partition**: [`StateFilesPartition`](../type-aliases/StateFilesPartition.md)

Defined in: [packages/agent-sdk/src/state-files.ts:46](https://github.com/zocomputer/zov2-code/blob/ce93d09ec2812425a1522360ec5d53274fce9d8d/packages/agent-sdk/src/state-files.ts#L46)

***

### stateInstanceId

> `readonly` **stateInstanceId**: `string`

Defined in: [packages/agent-sdk/src/state-files.ts:45](https://github.com/zocomputer/zov2-code/blob/ce93d09ec2812425a1522360ec5d53274fce9d8d/packages/agent-sdk/src/state-files.ts#L45)

***

### storeId

> `readonly` **storeId**: `string`

Defined in: [packages/agent-sdk/src/state-files.ts:44](https://github.com/zocomputer/zov2-code/blob/ce93d09ec2812425a1522360ec5d53274fce9d8d/packages/agent-sdk/src/state-files.ts#L44)
