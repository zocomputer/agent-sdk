[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [gateway-fetch](../README.md) / StreamGuardOptions

# Interface: StreamGuardOptions

Defined in: [packages/runtime-ai/src/stream-guards.ts:33](https://github.com/zocomputer/zov2-code/blob/1201055c5cc9e558bf15b3fd953dc08102ba49af/packages/runtime-ai/src/stream-guards.ts#L33)

First-byte and idle timeout options for stream guards.

## Properties

### firstByteMs

> `readonly` **firstByteMs**: `number`

Defined in: [packages/runtime-ai/src/stream-guards.ts:35](https://github.com/zocomputer/zov2-code/blob/1201055c5cc9e558bf15b3fd953dc08102ba49af/packages/runtime-ai/src/stream-guards.ts#L35)

Max wait for response headers, ms.

***

### idleMs

> `readonly` **idleMs**: `number`

Defined in: [packages/runtime-ai/src/stream-guards.ts:37](https://github.com/zocomputer/zov2-code/blob/1201055c5cc9e558bf15b3fd953dc08102ba49af/packages/runtime-ai/src/stream-guards.ts#L37)

Max quiet gap between response-body chunks, ms.
