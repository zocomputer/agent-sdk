[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [gateway-fetch](../README.md) / withStreamGuards

# Function: withStreamGuards()

> **withStreamGuards**(`baseFetch`, `options?`): *typeof* `fetch`

Defined in: [packages/runtime-ai/src/stream-guards.ts:49](https://github.com/zocomputer/zov2-code/blob/fc4b6dd8dd680b4495b1f44b776f9a8d76104d40/packages/runtime-ai/src/stream-guards.ts#L49)

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
