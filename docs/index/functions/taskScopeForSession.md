[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / taskScopeForSession

# Function: taskScopeForSession()

> **taskScopeForSession**(`sessionId`): [`TaskScope`](../interfaces/TaskScope.md)

Defined in: [packages/agent-sdk/src/async-tasks.ts:60](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/async-tasks.ts#L60)

Build the mandatory task scope for an Eve tool call. Missing session
context fails closed before work starts or task state is read.

## Parameters

### sessionId

`string` \| `undefined`

## Returns

[`TaskScope`](../interfaces/TaskScope.md)
