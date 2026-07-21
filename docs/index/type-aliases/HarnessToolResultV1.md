[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / HarnessToolResultV1

# Type Alias: HarnessToolResultV1\<Data\>

> **HarnessToolResultV1**\<`Data`\> = `object`

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:117](https://github.com/zocomputer/zov2-code/blob/9d3f4b0b6ac2b9a8a8d1307a4590af07d0d7978f/packages/agent-sdk/src/harness-protocol-v1.ts#L117)

Structured terminal data returned normally through Eve.

## Type Parameters

### Data

`Data` *extends* [`HarnessJsonValue`](HarnessJsonValue.md) = [`HarnessJsonValue`](HarnessJsonValue.md)

## Properties

### data

> `readonly` **data**: `Data`

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:124](https://github.com/zocomputer/zov2-code/blob/9d3f4b0b6ac2b9a8a8d1307a4590af07d0d7978f/packages/agent-sdk/src/harness-protocol-v1.ts#L124)

***

### effects?

> `readonly` `optional` **effects?**: readonly [`HarnessEffectReceiptV1`](HarnessEffectReceiptV1.md)[]

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:125](https://github.com/zocomputer/zov2-code/blob/9d3f4b0b6ac2b9a8a8d1307a4590af07d0d7978f/packages/agent-sdk/src/harness-protocol-v1.ts#L125)

***

### outcome

> `readonly` **outcome**: `"completed"` \| `"rejected"` \| `"blocked"`

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:123](https://github.com/zocomputer/zov2-code/blob/9d3f4b0b6ac2b9a8a8d1307a4590af07d0d7978f/packages/agent-sdk/src/harness-protocol-v1.ts#L123)

***

### schemaVersion

> `readonly` **schemaVersion**: `1`

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:118](https://github.com/zocomputer/zov2-code/blob/9d3f4b0b6ac2b9a8a8d1307a4590af07d0d7978f/packages/agent-sdk/src/harness-protocol-v1.ts#L118)

***

### tool

> `readonly` **tool**: `object`

Defined in: [packages/agent-sdk/src/harness-protocol-v1.ts:119](https://github.com/zocomputer/zov2-code/blob/9d3f4b0b6ac2b9a8a8d1307a4590af07d0d7978f/packages/agent-sdk/src/harness-protocol-v1.ts#L119)

#### behaviorVersion

> `readonly` **behaviorVersion**: `string`

#### canonicalName

> `readonly` **canonicalName**: `string`
