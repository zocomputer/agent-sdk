[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / WorkspaceIO

# Interface: WorkspaceIO

Defined in: [packages/agent-sdk/src/workspace-io.ts:82](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/workspace-io.ts#L82)

Byte-oriented workspace effects, async so a remote backend fits. All paths
are absolute (already resolved through `Workspace`); returned file lists
and match paths are workspace-root-relative with forward slashes.

## Methods

### listFiles()

> **listFiles**(`scope?`): `Promise`\<`Iterable`\<`string`, `any`, `any`\>\>

Defined in: [packages/agent-sdk/src/workspace-io.ts:93](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/workspace-io.ts#L93)

Candidate file paths for glob/grep — root-relative, gitignore-aware.
`scope` (absolute directory) narrows the listing.

#### Parameters

##### scope?

`string`

#### Returns

`Promise`\<`Iterable`\<`string`, `any`, `any`\>\>

***

### readFile()

> **readFile**(`abs`): `Promise`\<`Buffer`\<`ArrayBufferLike`\> \| `null`\>

Defined in: [packages/agent-sdk/src/workspace-io.ts:86](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/workspace-io.ts#L86)

Read one file's bytes; `null` when it doesn't exist.

#### Parameters

##### abs

`string`

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\> \| `null`\>

***

### search()

> **search**(`options`): `Promise`\<[`IoSearchResult`](IoSearchResult.md)\>

Defined in: [packages/agent-sdk/src/workspace-io.ts:95](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/workspace-io.ts#L95)

Regex content search, backend-native (in-process locally, rg/grep remotely).

#### Parameters

##### options

[`IoSearchOptions`](IoSearchOptions.md)

#### Returns

`Promise`\<[`IoSearchResult`](IoSearchResult.md)\>

***

### stat()

> **stat**(`abs`): `Promise`\<[`IoStat`](IoStat.md) \| `null`\>

Defined in: [packages/agent-sdk/src/workspace-io.ts:84](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/workspace-io.ts#L84)

Stat one path; `null` when it doesn't exist.

#### Parameters

##### abs

`string`

#### Returns

`Promise`\<[`IoStat`](IoStat.md) \| `null`\>

***

### writeFile()

> **writeFile**(`abs`, `content`): `Promise`\<`void`\>

Defined in: [packages/agent-sdk/src/workspace-io.ts:88](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/workspace-io.ts#L88)

Write one file, creating parent directories and overwriting.

#### Parameters

##### abs

`string`

##### content

`string` \| `Uint8Array`\<`ArrayBufferLike`\>

#### Returns

`Promise`\<`void`\>
