[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / GatewayModelInfo

# Interface: GatewayModelInfo

Defined in: [packages/agent-sdk/src/task.ts:239](https://github.com/zocomputer/zov2-code/blob/1fcc8b4b31cf28b6badb9d28c6512cd9261c730c/packages/agent-sdk/src/task.ts#L239)

One model entry from the AI Gateway's public model catalog.

## Properties

### contextWindow

> **contextWindow**: `number` \| `undefined`

Defined in: [packages/agent-sdk/src/task.ts:257](https://github.com/zocomputer/zov2-code/blob/1fcc8b4b31cf28b6badb9d28c6512cd9261c730c/packages/agent-sdk/src/task.ts#L257)

The model's context window in tokens (the catalog's `context_window`).
The number eve's `modelContextWindowTokens` needs for wrapped models
(which defeat its catalog auto-resolve), and the limit a context-usage
meter divides by. Refresh-script material like the rest of the entry —
check the resolved value in, never fetch at agent build time.
`undefined` when the entry carries none.

***

### description

> **description**: `string` \| `undefined`

Defined in: [packages/agent-sdk/src/task.ts:242](https://github.com/zocomputer/zov2-code/blob/1fcc8b4b31cf28b6badb9d28c6512cd9261c730c/packages/agent-sdk/src/task.ts#L242)

***

### id

> **id**: `string`

Defined in: [packages/agent-sdk/src/task.ts:240](https://github.com/zocomputer/zov2-code/blob/1fcc8b4b31cf28b6badb9d28c6512cd9261c730c/packages/agent-sdk/src/task.ts#L240)

***

### maxOutputTokens

> **maxOutputTokens**: `number` \| `undefined`

Defined in: [packages/agent-sdk/src/task.ts:262](https://github.com/zocomputer/zov2-code/blob/1fcc8b4b31cf28b6badb9d28c6512cd9261c730c/packages/agent-sdk/src/task.ts#L262)

The model's maximum output tokens per response (the catalog's
`max_tokens`). `undefined` when the entry carries none.

***

### name

> **name**: `string` \| `undefined`

Defined in: [packages/agent-sdk/src/task.ts:241](https://github.com/zocomputer/zov2-code/blob/1fcc8b4b31cf28b6badb9d28c6512cd9261c730c/packages/agent-sdk/src/task.ts#L241)

***

### tags

> **tags**: readonly `string`[] \| `undefined`

Defined in: [packages/agent-sdk/src/task.ts:248](https://github.com/zocomputer/zov2-code/blob/1fcc8b4b31cf28b6badb9d28c6512cd9261c730c/packages/agent-sdk/src/task.ts#L248)

Capability tags (e.g. `vision`, `file-input`, `reasoning`, `tool-use`) —
the input-modality signal `capabilitiesFromCatalogEntry`
(./model-capabilities.ts) reads. `undefined` when the entry carries none.
