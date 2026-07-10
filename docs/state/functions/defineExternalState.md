[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state](../README.md) / defineExternalState

# Function: defineExternalState()

> **defineExternalState**(`declaration`): [`ExternalStateDeclaration`](../interfaces/ExternalStateDeclaration.md)

Defined in: [packages/agent-sdk/src/state.ts:67](https://github.com/zocomputer/zov2-code/blob/311b5755d0a50f315302987e21c3a97a752a3696/packages/agent-sdk/src/state.ts#L67)

The declaration helper an agent default-exports from `agent/state/<name>.ts`.
Validates eagerly so a bad declaration fails at module load in local dev, not
first at deploy; deploy validation re-checks the source statically regardless
(it never executes agent code).

## Parameters

### declaration

[`ExternalStateDeclaration`](../interfaces/ExternalStateDeclaration.md)

## Returns

[`ExternalStateDeclaration`](../interfaces/ExternalStateDeclaration.md)
