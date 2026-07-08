[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [gateway-fetch](../README.md) / StreamGuardOptions

# Interface: StreamGuardOptions

Defined in: [packages/agent-sdk/src/gateway-fetch.ts:30](https://github.com/zocomputer/zov2-code/blob/1e3454bf19fec73047afd6e825710b7db25d004a/packages/agent-sdk/src/gateway-fetch.ts#L30)

First-byte and idle timeout options for stream guards.

## Properties

### firstByteMs

> `readonly` **firstByteMs**: `number`

Defined in: [packages/agent-sdk/src/gateway-fetch.ts:32](https://github.com/zocomputer/zov2-code/blob/1e3454bf19fec73047afd6e825710b7db25d004a/packages/agent-sdk/src/gateway-fetch.ts#L32)

Max wait for response headers, ms.

***

### idleMs

> `readonly` **idleMs**: `number`

Defined in: [packages/agent-sdk/src/gateway-fetch.ts:34](https://github.com/zocomputer/zov2-code/blob/1e3454bf19fec73047afd6e825710b7db25d004a/packages/agent-sdk/src/gateway-fetch.ts#L34)

Max quiet gap between response-body chunks, ms.
