[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / GatewayModelInfo

# Interface: GatewayModelInfo

Defined in: [packages/agent-sdk/src/task.ts:244](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/task.ts#L244)

One model entry from the AI Gateway's public model catalog.

## Properties

### contextWindow

> **contextWindow**: `number` \| `undefined`

Defined in: [packages/agent-sdk/src/task.ts:262](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/task.ts#L262)

The model's context window in tokens (the catalog's `context_window`).
The number eve's `modelContextWindowTokens` needs for wrapped models
(which defeat its catalog auto-resolve), and the limit a context-usage
meter divides by. Refresh-script material like the rest of the entry —
check the resolved value in, never fetch at agent build time.
`undefined` when the entry carries none.

***

### description

> **description**: `string` \| `undefined`

Defined in: [packages/agent-sdk/src/task.ts:247](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/task.ts#L247)

***

### id

> **id**: `string`

Defined in: [packages/agent-sdk/src/task.ts:245](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/task.ts#L245)

***

### maxOutputTokens

> **maxOutputTokens**: `number` \| `undefined`

Defined in: [packages/agent-sdk/src/task.ts:267](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/task.ts#L267)

The model's maximum output tokens per response (the catalog's
`max_tokens`). `undefined` when the entry carries none.

***

### name

> **name**: `string` \| `undefined`

Defined in: [packages/agent-sdk/src/task.ts:246](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/task.ts#L246)

***

### tags

> **tags**: readonly `string`[] \| `undefined`

Defined in: [packages/agent-sdk/src/task.ts:253](https://github.com/zocomputer/zov2-code/blob/2085c476e1f2b993443fa305a981a524da2250f3/packages/agent-sdk/src/task.ts#L253)

Capability tags (e.g. `vision`, `file-input`, `reasoning`, `tool-use`) —
the input-modality signal `capabilitiesFromCatalogEntry`
(./model-capabilities.ts) reads. `undefined` when the entry carries none.
