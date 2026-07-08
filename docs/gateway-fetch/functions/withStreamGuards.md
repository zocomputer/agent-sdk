[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [gateway-fetch](../README.md) / withStreamGuards

# Function: withStreamGuards()

> **withStreamGuards**(`baseFetch`, `options?`): *typeof* `fetch`

Defined in: [packages/agent-sdk/src/gateway-fetch.ts:48](https://github.com/zocomputer/zov2-code/blob/a8636edc2f6184e686ebe291b26c3e5e9b3ae7ef/packages/agent-sdk/src/gateway-fetch.ts#L48)

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
