[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / GatewayModelInfo

# Interface: GatewayModelInfo

Defined in: [packages/agent-sdk/src/task.ts:357](https://github.com/zocomputer/zov2-code/blob/3f2b99c534a9f8d96ad85214e02d7c759a75762c/packages/agent-sdk/src/task.ts#L357)

One model entry from the AI Gateway's public model catalog.

## Properties

### contextWindow

> **contextWindow**: `number` \| `undefined`

Defined in: [packages/agent-sdk/src/task.ts:375](https://github.com/zocomputer/zov2-code/blob/3f2b99c534a9f8d96ad85214e02d7c759a75762c/packages/agent-sdk/src/task.ts#L375)

The model's context window in tokens (the catalog's `context_window`).
The number eve's `modelContextWindowTokens` needs for wrapped models
(which defeat its catalog auto-resolve), and the limit a context-usage
meter divides by. Refresh-script material like the rest of the entry —
check the resolved value in, never fetch at agent build time.
`undefined` when the entry carries none.

***

### description

> **description**: `string` \| `undefined`

Defined in: [packages/agent-sdk/src/task.ts:360](https://github.com/zocomputer/zov2-code/blob/3f2b99c534a9f8d96ad85214e02d7c759a75762c/packages/agent-sdk/src/task.ts#L360)

***

### id

> **id**: `string`

Defined in: [packages/agent-sdk/src/task.ts:358](https://github.com/zocomputer/zov2-code/blob/3f2b99c534a9f8d96ad85214e02d7c759a75762c/packages/agent-sdk/src/task.ts#L358)

***

### maxOutputTokens

> **maxOutputTokens**: `number` \| `undefined`

Defined in: [packages/agent-sdk/src/task.ts:380](https://github.com/zocomputer/zov2-code/blob/3f2b99c534a9f8d96ad85214e02d7c759a75762c/packages/agent-sdk/src/task.ts#L380)

The model's maximum output tokens per response (the catalog's
`max_tokens`). `undefined` when the entry carries none.

***

### name

> **name**: `string` \| `undefined`

Defined in: [packages/agent-sdk/src/task.ts:359](https://github.com/zocomputer/zov2-code/blob/3f2b99c534a9f8d96ad85214e02d7c759a75762c/packages/agent-sdk/src/task.ts#L359)

***

### tags

> **tags**: readonly `string`[] \| `undefined`

Defined in: [packages/agent-sdk/src/task.ts:366](https://github.com/zocomputer/zov2-code/blob/3f2b99c534a9f8d96ad85214e02d7c759a75762c/packages/agent-sdk/src/task.ts#L366)

Capability tags (e.g. `vision`, `file-input`, `reasoning`, `tool-use`) —
the input-modality signal `capabilitiesFromCatalogEntry`
(./model-capabilities.ts) reads. `undefined` when the entry carries none.
