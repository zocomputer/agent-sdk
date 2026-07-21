[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / StateFilesS3Client

# Interface: StateFilesS3Client

Defined in: [packages/agent-sdk/src/state-files.ts:245](https://github.com/zocomputer/zov2-code/blob/bc82d445ad6dedff4ca3f700330838d6a3441bf7/packages/agent-sdk/src/state-files.ts#L245)

S3-compatible client interface for low-level state-files bucket operations.

## Methods

### deleteObject()

> **deleteObject**(`input`): `Promise`\<`void`\>

Defined in: [packages/agent-sdk/src/state-files.ts:253](https://github.com/zocomputer/zov2-code/blob/bc82d445ad6dedff4ca3f700330838d6a3441bf7/packages/agent-sdk/src/state-files.ts#L253)

Deletes an object from the bucket.

#### Parameters

##### input

[`StateFilesS3DeleteInput`](StateFilesS3DeleteInput.md)

#### Returns

`Promise`\<`void`\>

***

### listObjects()

> **listObjects**(`input`): `Promise`\<readonly [`StateFilesObject`](StateFilesObject.md)[]\>

Defined in: [packages/agent-sdk/src/state-files.ts:247](https://github.com/zocomputer/zov2-code/blob/bc82d445ad6dedff4ca3f700330838d6a3441bf7/packages/agent-sdk/src/state-files.ts#L247)

Lists objects in the bucket, optionally filtered by prefix.

#### Parameters

##### input

[`StateFilesS3ListInput`](StateFilesS3ListInput.md)

#### Returns

`Promise`\<readonly [`StateFilesObject`](StateFilesObject.md)[]\>

***

### readObject()

> **readObject**(`input`): `Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Defined in: [packages/agent-sdk/src/state-files.ts:249](https://github.com/zocomputer/zov2-code/blob/bc82d445ad6dedff4ca3f700330838d6a3441bf7/packages/agent-sdk/src/state-files.ts#L249)

Reads an object's body as bytes.

#### Parameters

##### input

[`StateFilesS3ReadInput`](StateFilesS3ReadInput.md)

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

***

### writeObject()

> **writeObject**(`input`): `Promise`\<`void`\>

Defined in: [packages/agent-sdk/src/state-files.ts:251](https://github.com/zocomputer/zov2-code/blob/bc82d445ad6dedff4ca3f700330838d6a3441bf7/packages/agent-sdk/src/state-files.ts#L251)

Writes an object to the bucket.

#### Parameters

##### input

[`StateFilesS3WriteInput`](StateFilesS3WriteInput.md)

#### Returns

`Promise`\<`void`\>
