[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / DirConventionsOptions

# Interface: DirConventionsOptions

Defined in: [packages/agent-sdk/src/dir-conventions.ts:26](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/dir-conventions.ts#L26)

Options for a directory-conventions tracker that delivers nested convention files on first read.

## Properties

### fileName?

> `optional` **fileName?**: `string`

Defined in: [packages/agent-sdk/src/dir-conventions.ts:30](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/dir-conventions.ts#L30)

Conventions filename to look for in each directory. Default "AGENTS.md".

***

### loadFile?

> `optional` **loadFile?**: (`absPath`) => `string` \| `Promise`\<`string` \| `null`\> \| `null`

Defined in: [packages/agent-sdk/src/dir-conventions.ts:49](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/dir-conventions.ts#L49)

File loader, injectable for tests. Returns the file's content or null
when it doesn't exist (sync or async — a sandbox-backed read is async).
Defaults to a UTF-8 fs read. Callers with a per-call I/O backend (the
read tool resolving a sandbox session) pass a loader to `collect`
instead, which overrides this one.

#### Parameters

##### absPath

`string`

#### Returns

`string` \| `Promise`\<`string` \| `null`\> \| `null`

***

### maxBytesPerFile?

> `optional` **maxBytesPerFile?**: `number`

Defined in: [packages/agent-sdk/src/dir-conventions.ts:35](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/dir-conventions.ts#L35)

Per-file content cap in bytes; an oversized conventions file becomes a
pointer note instead of inline content. Default 16 KB.

***

### maxFilesPerRead?

> `optional` **maxFilesPerRead?**: `number`

Defined in: [packages/agent-sdk/src/dir-conventions.ts:41](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/dir-conventions.ts#L41)

Max conventions files inlined per read; on a first read deep in a tree,
the directories nearest the file get content and the rest get pointer
notes. Default 4.

***

### maxSessions?

> `optional` **maxSessions?**: `number`

Defined in: [packages/agent-sdk/src/dir-conventions.ts:54](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/dir-conventions.ts#L54)

Max sessions tracked per workspace; least-recently-used sessions evict
first (an evicted session that reappears re-delivers). Default 100.

***

### workspaceRoot

> **workspaceRoot**: `string`

Defined in: [packages/agent-sdk/src/dir-conventions.ts:28](https://github.com/zocomputer/zov2-code/blob/3d6083b79028d6a09427aa09f4ad328376cc8493/packages/agent-sdk/src/dir-conventions.ts#L28)

Workspace root; the chain walks from here (exclusive) down to the file.
