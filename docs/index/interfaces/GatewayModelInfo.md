[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / GatewayModelInfo

# Interface: GatewayModelInfo

Defined in: [packages/agent-sdk/src/task.ts:365](https://github.com/zocomputer/zov2-code/blob/ef70d86dc0c3cdb95eb7c208e5ea40a4edf9effb/packages/agent-sdk/src/task.ts#L365)

One model entry from the AI Gateway's public model catalog.

## Properties

### contextWindow

> **contextWindow**: `number` \| `undefined`

Defined in: [packages/agent-sdk/src/task.ts:383](https://github.com/zocomputer/zov2-code/blob/ef70d86dc0c3cdb95eb7c208e5ea40a4edf9effb/packages/agent-sdk/src/task.ts#L383)

The model's context window in tokens (the catalog's `context_window`).
The number eve's `modelContextWindowTokens` needs for wrapped models
(which defeat its catalog auto-resolve), and the limit a context-usage
meter divides by. Refresh-script material like the rest of the entry —
check the resolved value in, never fetch at agent build time.
`undefined` when the entry carries none.

***

### description

> **description**: `string` \| `undefined`

Defined in: [packages/agent-sdk/src/task.ts:368](https://github.com/zocomputer/zov2-code/blob/ef70d86dc0c3cdb95eb7c208e5ea40a4edf9effb/packages/agent-sdk/src/task.ts#L368)

***

### id

> **id**: `string`

Defined in: [packages/agent-sdk/src/task.ts:366](https://github.com/zocomputer/zov2-code/blob/ef70d86dc0c3cdb95eb7c208e5ea40a4edf9effb/packages/agent-sdk/src/task.ts#L366)

***

### maxOutputTokens

> **maxOutputTokens**: `number` \| `undefined`

Defined in: [packages/agent-sdk/src/task.ts:388](https://github.com/zocomputer/zov2-code/blob/ef70d86dc0c3cdb95eb7c208e5ea40a4edf9effb/packages/agent-sdk/src/task.ts#L388)

The model's maximum output tokens per response (the catalog's
`max_tokens`). `undefined` when the entry carries none.

***

### name

> **name**: `string` \| `undefined`

Defined in: [packages/agent-sdk/src/task.ts:367](https://github.com/zocomputer/zov2-code/blob/ef70d86dc0c3cdb95eb7c208e5ea40a4edf9effb/packages/agent-sdk/src/task.ts#L367)

***

### tags

> **tags**: readonly `string`[] \| `undefined`

Defined in: [packages/agent-sdk/src/task.ts:374](https://github.com/zocomputer/zov2-code/blob/ef70d86dc0c3cdb95eb7c208e5ea40a4edf9effb/packages/agent-sdk/src/task.ts#L374)

Capability tags (e.g. `vision`, `file-input`, `reasoning`, `tool-use`) —
the input-modality signal `capabilitiesFromCatalogEntry`
(./model-capabilities.ts) reads. `undefined` when the entry carries none.
