[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [attachments](../README.md) / DEFAULT\_MAX\_INLINE\_MEDIA\_BYTES

# Variable: DEFAULT\_MAX\_INLINE\_MEDIA\_BYTES

> `const` **DEFAULT\_MAX\_INLINE\_MEDIA\_BYTES**: `number`

Defined in: [packages/agent-sdk/src/attachments.ts:32](https://github.com/zocomputer/zov2-code/blob/a259f6f3d345009ac90c86d9f10d9171b99736b9/packages/agent-sdk/src/attachments.ts#L32)

Default cap for inlining video/audio bytes: 10 MB, matching read's stat
guard (bigger files never reach the attach decision). Bounds durable-stream
bloat — the data URL rides the stream once per read/fetch.
