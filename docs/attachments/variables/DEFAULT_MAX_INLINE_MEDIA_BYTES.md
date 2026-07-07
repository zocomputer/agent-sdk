[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [attachments](../README.md) / DEFAULT\_MAX\_INLINE\_MEDIA\_BYTES

# Variable: DEFAULT\_MAX\_INLINE\_MEDIA\_BYTES

> `const` **DEFAULT\_MAX\_INLINE\_MEDIA\_BYTES**: `number`

Defined in: [packages/agent-sdk/src/attachments.ts:32](https://github.com/zocomputer/zov2-code/blob/6ab5ae927225cb2a14ac9cd70c43ecf9eb01921d/packages/agent-sdk/src/attachments.ts#L32)

Default cap for inlining video/audio bytes: 10 MB, matching read's stat
guard (bigger files never reach the attach decision). Bounds durable-stream
bloat — the data URL rides the stream once per read/fetch.
