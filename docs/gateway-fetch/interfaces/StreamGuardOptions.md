[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [gateway-fetch](../README.md) / StreamGuardOptions

# Interface: StreamGuardOptions

Defined in: [packages/runtime-ai/src/stream-guards.ts:31](https://github.com/zocomputer/zov2-code/blob/2f680aef81cf6a147ceac91fe4d066f3e4aff1b6/packages/runtime-ai/src/stream-guards.ts#L31)

First-byte and idle timeout options for stream guards.

## Properties

### firstByteMs

> `readonly` **firstByteMs**: `number`

Defined in: [packages/runtime-ai/src/stream-guards.ts:33](https://github.com/zocomputer/zov2-code/blob/2f680aef81cf6a147ceac91fe4d066f3e4aff1b6/packages/runtime-ai/src/stream-guards.ts#L33)

Max wait for response headers, ms.

***

### idleMs

> `readonly` **idleMs**: `number`

Defined in: [packages/runtime-ai/src/stream-guards.ts:35](https://github.com/zocomputer/zov2-code/blob/2f680aef81cf6a147ceac91fe4d066f3e4aff1b6/packages/runtime-ai/src/stream-guards.ts#L35)

Max quiet gap between response-body chunks, ms.
