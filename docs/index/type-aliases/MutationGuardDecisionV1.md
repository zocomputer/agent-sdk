[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / MutationGuardDecisionV1

# Type Alias: MutationGuardDecisionV1

> **MutationGuardDecisionV1** = \{ `attempt`: `number`; `fingerprint`: [`MutationGuardFingerprintV1`](MutationGuardFingerprintV1.md); `kind`: `"proceed"`; \} \| \{ `data`: [`MutationGuardBlockedDataV1`](MutationGuardBlockedDataV1.md); `kind`: `"blocked"`; \}

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:228](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/harness-protocol-v1.ts#L228)

Durable guard decision returned before a mutation executes.
