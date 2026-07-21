[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / MutationGuardDecisionV1

# Type Alias: MutationGuardDecisionV1

> **MutationGuardDecisionV1** = \{ `attempt`: `number`; `fingerprint`: [`MutationGuardFingerprintV1`](MutationGuardFingerprintV1.md); `kind`: `"proceed"`; \} \| \{ `data`: [`MutationGuardBlockedDataV1`](MutationGuardBlockedDataV1.md); `kind`: `"blocked"`; \}

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:228](https://github.com/zocomputer/zov2-code/blob/fc65ac4f3ad029ed138ee11331693cba0bd295b4/packages/agent-sdk/src/harness-protocol-v1.ts#L228)

Durable guard decision returned before a mutation executes.
