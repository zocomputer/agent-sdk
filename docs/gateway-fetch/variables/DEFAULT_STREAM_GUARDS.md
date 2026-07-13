[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [gateway-fetch](../README.md) / DEFAULT\_STREAM\_GUARDS

# Variable: DEFAULT\_STREAM\_GUARDS

> `const` **DEFAULT\_STREAM\_GUARDS**: [`StreamGuardOptions`](../interfaces/StreamGuardOptions.md)

Defined in: [packages/runtime-ai/src/stream-guards.ts:39](https://github.com/zocomputer/zov2-code/blob/fc4b6dd8dd680b4495b1f44b776f9a8d76104d40/packages/runtime-ai/src/stream-guards.ts#L39)

Generous defaults that convert a dead connection into a retryable error without racing slow-but-alive models. Headers should arrive in seconds; reasoning models can pause between chunks, so the idle guard gets minutes.
