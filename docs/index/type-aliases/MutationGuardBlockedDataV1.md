[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / MutationGuardBlockedDataV1

# Type Alias: MutationGuardBlockedDataV1

> **MutationGuardBlockedDataV1** = `object`

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:240](https://github.com/zocomputer/zov2-code/blob/178825142421d42c04f57b0afbc80612a16fe4c6/packages/agent-sdk/src/harness-protocol-v1.ts#L240)

Typed `data` payload for a normally returned blocked tool result.

## Properties

### attempt

> `readonly` **attempt**: `number`

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:245](https://github.com/zocomputer/zov2-code/blob/178825142421d42c04f57b0afbc80612a16fe4c6/packages/agent-sdk/src/harness-protocol-v1.ts#L245)

***

### correctiveMessage

> `readonly` **correctiveMessage**: `string`

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:247](https://github.com/zocomputer/zov2-code/blob/178825142421d42c04f57b0afbc80612a16fe4c6/packages/agent-sdk/src/harness-protocol-v1.ts#L247)

***

### fingerprint

> `readonly` **fingerprint**: [`MutationGuardFingerprintV1`](MutationGuardFingerprintV1.md)

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:244](https://github.com/zocomputer/zov2-code/blob/178825142421d42c04f57b0afbc80612a16fe4c6/packages/agent-sdk/src/harness-protocol-v1.ts#L244)

***

### guardVersion

> `readonly` **guardVersion**: `1`

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:241](https://github.com/zocomputer/zov2-code/blob/178825142421d42c04f57b0afbc80612a16fe4c6/packages/agent-sdk/src/harness-protocol-v1.ts#L241)

***

### kind

> `readonly` **kind**: `"mutation-guard"`

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:242](https://github.com/zocomputer/zov2-code/blob/178825142421d42c04f57b0afbc80612a16fe4c6/packages/agent-sdk/src/harness-protocol-v1.ts#L242)

***

### reason

> `readonly` **reason**: `"repeated-mutation-threshold"` \| `"guard-unavailable"`

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:243](https://github.com/zocomputer/zov2-code/blob/178825142421d42c04f57b0afbc80612a16fe4c6/packages/agent-sdk/src/harness-protocol-v1.ts#L243)

***

### threshold

> `readonly` **threshold**: `number`

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:246](https://github.com/zocomputer/zov2-code/blob/178825142421d42c04f57b0afbc80612a16fe4c6/packages/agent-sdk/src/harness-protocol-v1.ts#L246)
