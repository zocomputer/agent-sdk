[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / taskScopeForSession

# Function: taskScopeForSession()

> **taskScopeForSession**(`sessionId`): [`TaskScope`](../interfaces/TaskScope.md)

Defined in: [packages/agent-sdk/src/async-tasks.ts:60](https://github.com/zocomputer/zov2-code/blob/48650141bb7b851495928e6463ae438988b79a49/packages/agent-sdk/src/async-tasks.ts#L60)

Build the mandatory task scope for an Eve tool call. Missing session
context fails closed before work starts or task state is read.

## Parameters

### sessionId

`string` \| `undefined`

## Returns

[`TaskScope`](../interfaces/TaskScope.md)
