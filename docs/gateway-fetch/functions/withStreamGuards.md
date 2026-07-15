[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [gateway-fetch](../README.md) / withStreamGuards

# Function: withStreamGuards()

> **withStreamGuards**(`baseFetch`, `options?`): *typeof* `fetch`

Defined in: [packages/runtime-ai/src/stream-guards.ts:51](https://github.com/zocomputer/zov2-code/blob/ea094c0d7d3efd4351c48b5c1bd38d95a1836e8d/packages/runtime-ai/src/stream-guards.ts#L51)

Wrap a fetch with first-byte and idle timeouts. The returned fetch chains
any caller-provided abort signal, preserves status/headers, and passes
body-less responses through untouched.

## Parameters

### baseFetch

[`FetchCall`](../type-aliases/FetchCall.md)

### options?

[`StreamGuardOptions`](../interfaces/StreamGuardOptions.md) = `DEFAULT_STREAM_GUARDS`

## Returns

*typeof* `fetch`
