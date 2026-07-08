[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state](../README.md) / defineExternalState

# Function: defineExternalState()

> **defineExternalState**(`declaration`): [`ExternalStateDeclaration`](../interfaces/ExternalStateDeclaration.md)

Defined in: [packages/agent-sdk/src/state.ts:67](https://github.com/zocomputer/zov2-code/blob/a8636edc2f6184e686ebe291b26c3e5e9b3ae7ef/packages/agent-sdk/src/state.ts#L67)

The declaration helper an agent default-exports from `agent/state/<name>.ts`.
Validates eagerly so a bad declaration fails at module load in local dev, not
first at deploy; deploy validation re-checks the source statically regardless
(it never executes agent code).

## Parameters

### declaration

[`ExternalStateDeclaration`](../interfaces/ExternalStateDeclaration.md)

## Returns

[`ExternalStateDeclaration`](../interfaces/ExternalStateDeclaration.md)
