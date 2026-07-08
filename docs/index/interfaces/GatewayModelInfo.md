[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / GatewayModelInfo

# Interface: GatewayModelInfo

Defined in: [packages/agent-sdk/src/task.ts:357](https://github.com/zocomputer/zov2-code/blob/aba140d6dd71d0ea05075bf6e9ebcc5739f7a7b3/packages/agent-sdk/src/task.ts#L357)

One model entry from the AI Gateway's public model catalog.

## Properties

### description

> **description**: `string` \| `undefined`

Defined in: [packages/agent-sdk/src/task.ts:360](https://github.com/zocomputer/zov2-code/blob/aba140d6dd71d0ea05075bf6e9ebcc5739f7a7b3/packages/agent-sdk/src/task.ts#L360)

***

### id

> **id**: `string`

Defined in: [packages/agent-sdk/src/task.ts:358](https://github.com/zocomputer/zov2-code/blob/aba140d6dd71d0ea05075bf6e9ebcc5739f7a7b3/packages/agent-sdk/src/task.ts#L358)

***

### name

> **name**: `string` \| `undefined`

Defined in: [packages/agent-sdk/src/task.ts:359](https://github.com/zocomputer/zov2-code/blob/aba140d6dd71d0ea05075bf6e9ebcc5739f7a7b3/packages/agent-sdk/src/task.ts#L359)

***

### tags

> **tags**: readonly `string`[] \| `undefined`

Defined in: [packages/agent-sdk/src/task.ts:366](https://github.com/zocomputer/zov2-code/blob/aba140d6dd71d0ea05075bf6e9ebcc5739f7a7b3/packages/agent-sdk/src/task.ts#L366)

Capability tags (e.g. `vision`, `file-input`, `reasoning`, `tool-use`) —
the input-modality signal `capabilitiesFromCatalogEntry`
(./model-capabilities.ts) reads. `undefined` when the entry carries none.
