[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [gateway-fetch](../README.md) / DEFAULT\_STREAM\_GUARDS

# Variable: DEFAULT\_STREAM\_GUARDS

> `const` **DEFAULT\_STREAM\_GUARDS**: [`StreamGuardOptions`](../interfaces/StreamGuardOptions.md)

Defined in: [packages/agent-sdk/src/gateway-fetch.ts:38](https://github.com/zocomputer/zov2-code/blob/9c31432d7362033dfbece45d1305011eb46c55ac/packages/agent-sdk/src/gateway-fetch.ts#L38)

Generous defaults that convert a dead connection into a retryable error without racing slow-but-alive models. Headers should arrive in seconds; reasoning models can pause between chunks, so the idle guard gets minutes.
