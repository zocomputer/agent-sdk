[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [gateway-fetch](../README.md) / DEFAULT\_STREAM\_GUARDS

# Variable: DEFAULT\_STREAM\_GUARDS

> `const` **DEFAULT\_STREAM\_GUARDS**: [`StreamGuardOptions`](../interfaces/StreamGuardOptions.md)

Defined in: [packages/runtime-ai/src/stream-guards.ts:41](https://github.com/zocomputer/zov2-code/blob/3717bd4ab29bacfe3ae9a5e05df2947880cbf6c9/packages/runtime-ai/src/stream-guards.ts#L41)

Generous defaults that convert a dead connection into a retryable error without racing slow-but-alive models. Headers should arrive in seconds; reasoning models can pause between chunks, so the idle guard gets minutes.
