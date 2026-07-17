[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / DeploymentToolManifestV1

# Type Alias: DeploymentToolManifestV1

> **DeploymentToolManifestV1** = `object`

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:186](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/harness-protocol-v1.ts#L186)

Exact SDK and source authority for one selectable deployment.

## Properties

### completionContracts

> `readonly` **completionContracts**: readonly [`CompletionContractV1`](CompletionContractV1.md)[]

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:198](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/harness-protocol-v1.ts#L198)

***

### deploymentId

> `readonly` **deploymentId**: `string`

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:188](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/harness-protocol-v1.ts#L188)

***

### descriptorCatalogDigest

> `readonly` **descriptorCatalogDigest**: [`HarnessSha256Digest`](HarnessSha256Digest.md)

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:195](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/harness-protocol-v1.ts#L195)

***

### schemaVersion

> `readonly` **schemaVersion**: `1`

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:187](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/harness-protocol-v1.ts#L187)

***

### sdk

> `readonly` **sdk**: `object`

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:189](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/harness-protocol-v1.ts#L189)

#### immutableRef

> `readonly` **immutableRef**: `string`

Immutable package/tree identity. Mutable ranges are rejected at preflight.

#### packageName

> `readonly` **packageName**: `"@zocomputer/agent-sdk"`

#### version

> `readonly` **version**: `string`

***

### tools

> `readonly` **tools**: readonly [`DeploymentToolBindingV1`](DeploymentToolBindingV1.md)[]

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:197](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/harness-protocol-v1.ts#L197)

***

### toolSourceDigest

> `readonly` **toolSourceDigest**: [`HarnessSha256Digest`](HarnessSha256Digest.md)

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:196](https://github.com/zocomputer/zov2-code/blob/d9e9bc136ecf8175c3ca15852a35b081ef1a8a38/packages/agent-sdk/src/harness-protocol-v1.ts#L196)
