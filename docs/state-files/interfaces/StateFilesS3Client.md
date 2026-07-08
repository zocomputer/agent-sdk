[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state-files](../README.md) / StateFilesS3Client

# Interface: StateFilesS3Client

Defined in: [packages/agent-sdk/src/state-files.ts:240](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/state-files.ts#L240)

S3-compatible client interface for low-level state-files bucket operations.

## Methods

### deleteObject()

> **deleteObject**(`input`): `Promise`\<`void`\>

Defined in: [packages/agent-sdk/src/state-files.ts:248](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/state-files.ts#L248)

Deletes an object from the bucket.

#### Parameters

##### input

[`StateFilesS3DeleteInput`](StateFilesS3DeleteInput.md)

#### Returns

`Promise`\<`void`\>

***

### listObjects()

> **listObjects**(`input`): `Promise`\<readonly [`StateFilesObject`](StateFilesObject.md)[]\>

Defined in: [packages/agent-sdk/src/state-files.ts:242](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/state-files.ts#L242)

Lists objects in the bucket, optionally filtered by prefix.

#### Parameters

##### input

[`StateFilesS3ListInput`](StateFilesS3ListInput.md)

#### Returns

`Promise`\<readonly [`StateFilesObject`](StateFilesObject.md)[]\>

***

### readObject()

> **readObject**(`input`): `Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Defined in: [packages/agent-sdk/src/state-files.ts:244](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/state-files.ts#L244)

Reads an object's body as bytes.

#### Parameters

##### input

[`StateFilesS3ReadInput`](StateFilesS3ReadInput.md)

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

***

### writeObject()

> **writeObject**(`input`): `Promise`\<`void`\>

Defined in: [packages/agent-sdk/src/state-files.ts:246](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/state-files.ts#L246)

Writes an object to the bucket.

#### Parameters

##### input

[`StateFilesS3WriteInput`](StateFilesS3WriteInput.md)

#### Returns

`Promise`\<`void`\>
