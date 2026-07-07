[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / StateFilesS3Client

# Interface: StateFilesS3Client

Defined in: [packages/agent-sdk/src/state-files.ts:222](https://github.com/zocomputer/zov2-code/blob/df4b939a34db36cf82bffe0187f8c98f4e308c18/packages/agent-sdk/src/state-files.ts#L222)

S3-compatible client interface for low-level state-files bucket operations.

## Methods

### deleteObject()

> **deleteObject**(`input`): `Promise`\<`void`\>

Defined in: [packages/agent-sdk/src/state-files.ts:230](https://github.com/zocomputer/zov2-code/blob/df4b939a34db36cf82bffe0187f8c98f4e308c18/packages/agent-sdk/src/state-files.ts#L230)

Deletes an object from the bucket.

#### Parameters

##### input

[`StateFilesS3DeleteInput`](StateFilesS3DeleteInput.md)

#### Returns

`Promise`\<`void`\>

***

### listObjects()

> **listObjects**(`input`): `Promise`\<readonly [`StateFilesObject`](StateFilesObject.md)[]\>

Defined in: [packages/agent-sdk/src/state-files.ts:224](https://github.com/zocomputer/zov2-code/blob/df4b939a34db36cf82bffe0187f8c98f4e308c18/packages/agent-sdk/src/state-files.ts#L224)

Lists objects in the bucket, optionally filtered by prefix.

#### Parameters

##### input

[`StateFilesS3ListInput`](StateFilesS3ListInput.md)

#### Returns

`Promise`\<readonly [`StateFilesObject`](StateFilesObject.md)[]\>

***

### readObject()

> **readObject**(`input`): `Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Defined in: [packages/agent-sdk/src/state-files.ts:226](https://github.com/zocomputer/zov2-code/blob/df4b939a34db36cf82bffe0187f8c98f4e308c18/packages/agent-sdk/src/state-files.ts#L226)

Reads an object's body as bytes.

#### Parameters

##### input

[`StateFilesS3ReadInput`](StateFilesS3ReadInput.md)

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

***

### writeObject()

> **writeObject**(`input`): `Promise`\<`void`\>

Defined in: [packages/agent-sdk/src/state-files.ts:228](https://github.com/zocomputer/zov2-code/blob/df4b939a34db36cf82bffe0187f8c98f4e308c18/packages/agent-sdk/src/state-files.ts#L228)

Writes an object to the bucket.

#### Parameters

##### input

[`StateFilesS3WriteInput`](StateFilesS3WriteInput.md)

#### Returns

`Promise`\<`void`\>
