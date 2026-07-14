[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [gateway-fetch](../README.md) / StreamGuardOptions

# Interface: StreamGuardOptions

Defined in: [packages/runtime-ai/src/stream-guards.ts:33](https://github.com/zocomputer/zov2-code/blob/e7fb39c35601ce5ee40494fbfe469df1f7a9ecc4/packages/runtime-ai/src/stream-guards.ts#L33)

First-byte and idle timeout options for stream guards.

## Properties

### firstByteMs

> `readonly` **firstByteMs**: `number`

Defined in: [packages/runtime-ai/src/stream-guards.ts:35](https://github.com/zocomputer/zov2-code/blob/e7fb39c35601ce5ee40494fbfe469df1f7a9ecc4/packages/runtime-ai/src/stream-guards.ts#L35)

Max wait for response headers, ms.

***

### idleMs

> `readonly` **idleMs**: `number`

Defined in: [packages/runtime-ai/src/stream-guards.ts:37](https://github.com/zocomputer/zov2-code/blob/e7fb39c35601ce5ee40494fbfe469df1f7a9ecc4/packages/runtime-ai/src/stream-guards.ts#L37)

Max quiet gap between response-body chunks, ms.
