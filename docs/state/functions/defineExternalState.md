[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state](../README.md) / defineExternalState

# Function: defineExternalState()

> **defineExternalState**(`declaration`): [`ExternalStateDeclaration`](../interfaces/ExternalStateDeclaration.md)

Defined in: [packages/agent-sdk/src/state.ts:67](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/state.ts#L67)

The declaration helper an agent default-exports from `agent/state/<name>.ts`.
Validates eagerly so a bad declaration fails at module load in local dev, not
first at deploy; deploy validation re-checks the source statically regardless
(it never executes agent code).

## Parameters

### declaration

[`ExternalStateDeclaration`](../interfaces/ExternalStateDeclaration.md)

## Returns

[`ExternalStateDeclaration`](../interfaces/ExternalStateDeclaration.md)
