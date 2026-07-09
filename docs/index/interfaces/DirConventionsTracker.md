[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / DirConventionsTracker

# Interface: DirConventionsTracker

Defined in: [packages/agent-sdk/src/dir-conventions.ts:58](https://github.com/zocomputer/zov2-code/blob/a259f6f3d345009ac90c86d9f10d9171b99736b9/packages/agent-sdk/src/dir-conventions.ts#L58)

Tracks which directories have delivered their conventions files to each session.

## Methods

### collect()

> **collect**(`sessionId`, `relPath`, `loadFile?`): `Promise`\<[`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]\>

Defined in: [packages/agent-sdk/src/dir-conventions.ts:67](https://github.com/zocomputer/zov2-code/blob/a259f6f3d345009ac90c86d9f10d9171b99736b9/packages/agent-sdk/src/dir-conventions.ts#L67)

Riders for a read of `relPath` (workspace-relative), marking every
directory on its chain as delivered for `sessionId`. No session id (a
caller outside an eve session) → no riders, no tracking. `loadFile`
overrides the tracker's own loader for this call — the read tool passes
its per-call workspace IO here so riders come off the same backend
(local disk or sandbox) as the read itself.

#### Parameters

##### sessionId

`string` \| `undefined`

##### relPath

`string`

##### loadFile?

(`absPath`) => `string` \| `Promise`\<`string` \| `null`\> \| `null`

#### Returns

`Promise`\<[`DirConventionsRider`](../type-aliases/DirConventionsRider.md)[]\>
