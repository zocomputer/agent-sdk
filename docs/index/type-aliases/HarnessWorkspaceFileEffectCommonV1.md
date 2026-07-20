[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / HarnessWorkspaceFileEffectCommonV1

# Type Alias: HarnessWorkspaceFileEffectCommonV1

> **HarnessWorkspaceFileEffectCommonV1** = `object`

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:81](https://github.com/zocomputer/zov2-code/blob/9a2687559528851e1e25b6b64341058d2d74e9dc/packages/agent-sdk/src/harness-protocol-v1.ts#L81)

Fields shared by every workspace file effect receipt.

## Properties

### callId?

> `readonly` `optional` **callId?**: `string`

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:86](https://github.com/zocomputer/zov2-code/blob/9a2687559528851e1e25b6b64341058d2d74e9dc/packages/agent-sdk/src/harness-protocol-v1.ts#L86)

***

### content

> `readonly` **content**: [`HarnessFileEffectContentV1`](HarnessFileEffectContentV1.md)

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:85](https://github.com/zocomputer/zov2-code/blob/9a2687559528851e1e25b6b64341058d2d74e9dc/packages/agent-sdk/src/harness-protocol-v1.ts#L85)

***

### kind

> `readonly` **kind**: `"workspace.file"`

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:83](https://github.com/zocomputer/zov2-code/blob/9a2687559528851e1e25b6b64341058d2d74e9dc/packages/agent-sdk/src/harness-protocol-v1.ts#L83)

***

### path

> `readonly` **path**: `string`

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:84](https://github.com/zocomputer/zov2-code/blob/9a2687559528851e1e25b6b64341058d2d74e9dc/packages/agent-sdk/src/harness-protocol-v1.ts#L84)

***

### schemaVersion

> `readonly` **schemaVersion**: `1`

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:82](https://github.com/zocomputer/zov2-code/blob/9a2687559528851e1e25b6b64341058d2d74e9dc/packages/agent-sdk/src/harness-protocol-v1.ts#L82)

***

### turn?

> `readonly` `optional` **turn?**: [`HarnessEffectTurnIdentityV1`](HarnessEffectTurnIdentityV1.md)

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:87](https://github.com/zocomputer/zov2-code/blob/9a2687559528851e1e25b6b64341058d2d74e9dc/packages/agent-sdk/src/harness-protocol-v1.ts#L87)
