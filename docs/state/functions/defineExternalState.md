[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [state](../README.md) / defineExternalState

# Function: defineExternalState()

> **defineExternalState**(`declaration`): [`ExternalStateDeclaration`](../interfaces/ExternalStateDeclaration.md)

Defined in: [packages/agent-sdk/src/state.ts:67](https://github.com/zocomputer/zov2-code/blob/48650141bb7b851495928e6463ae438988b79a49/packages/agent-sdk/src/state.ts#L67)

The declaration helper an agent default-exports from `agent/state/<name>.ts`.
Validates eagerly so a bad declaration fails at module load in local dev, not
first at deploy; deploy validation re-checks the source statically regardless
(it never executes agent code).

## Parameters

### declaration

[`ExternalStateDeclaration`](../interfaces/ExternalStateDeclaration.md)

## Returns

[`ExternalStateDeclaration`](../interfaces/ExternalStateDeclaration.md)
