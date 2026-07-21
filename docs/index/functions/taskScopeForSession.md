[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / taskScopeForSession

# Function: taskScopeForSession()

> **taskScopeForSession**(`sessionId`): [`TaskScope`](../interfaces/TaskScope.md)

Defined in: [packages/agent-sdk/src/async-tasks.ts:60](https://github.com/zocomputer/zov2-code/blob/fc65ac4f3ad029ed138ee11331693cba0bd295b4/packages/agent-sdk/src/async-tasks.ts#L60)

Build the mandatory task scope for an Eve tool call. Missing session
context fails closed before work starts or task state is read.

## Parameters

### sessionId

`string` \| `undefined`

## Returns

[`TaskScope`](../interfaces/TaskScope.md)
