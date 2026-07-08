[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [gateway-fetch](../README.md) / withStreamGuards

# Function: withStreamGuards()

> **withStreamGuards**(`baseFetch`, `options?`): *typeof* `fetch`

Defined in: [packages/agent-sdk/src/gateway-fetch.ts:48](https://github.com/zocomputer/zov2-code/blob/3f2b99c534a9f8d96ad85214e02d7c759a75762c/packages/agent-sdk/src/gateway-fetch.ts#L48)

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
