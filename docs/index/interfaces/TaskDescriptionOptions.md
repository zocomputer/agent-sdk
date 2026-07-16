[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / TaskDescriptionOptions

# Interface: TaskDescriptionOptions

Defined in: [packages/agent-sdk/src/task.ts:132](https://github.com/zocomputer/zov2-code/blob/f537e0a90da222390e69bcbf7e329142b9e8d4b0/packages/agent-sdk/src/task.ts#L132)

Options for `buildTaskDescription`: the pinned model's display name and
catalog blurb, when to pick this tier over its siblings, capability notes
for excluded tools, and what the description calls the workspace.

## Extended by

- [`TaskAgentOptions`](TaskAgentOptions.md)

## Properties

### capabilityNote?

> `optional` **capabilityNote?**: `string`

Defined in: [packages/agent-sdk/src/task.ts:160](https://github.com/zocomputer/zov2-code/blob/f537e0a90da222390e69bcbf7e329142b9e8d4b0/packages/agent-sdk/src/task.ts#L160)

What the child CANNOT do relative to the parent, as one complete
sentence — name the excluded tools when the consumer excludes any
(`excludedParentTools`), so the parent never delegates work the child
can't perform. Omit only when the child truly mirrors the parent's
authored toolset.

***

### modelBlurb?

> `optional` **modelBlurb?**: `string`

Defined in: [packages/agent-sdk/src/task.ts:152](https://github.com/zocomputer/zov2-code/blob/f537e0a90da222390e69bcbf7e329142b9e8d4b0/packages/agent-sdk/src/task.ts#L152)

The model's own catalog description (from the AI Gateway model catalog —
see [fetchGatewayModelCatalog](../functions/fetchGatewayModelCatalog.md)). Checked in by the consumer, never
fetched at agent build time: tool descriptions are part of the cached
prompt prefix and must be static and offline-safe.

Explicitly `| undefined` (the exactOptionalPropertyTypes idiom): consumers
feed a `Record<string, string>` catalog lookup, which may miss — an
explicit `undefined` reads the same as omitting the blurb.

***

### modelName

> **modelName**: `string`

Defined in: [packages/agent-sdk/src/task.ts:134](https://github.com/zocomputer/zov2-code/blob/f537e0a90da222390e69bcbf7e329142b9e8d4b0/packages/agent-sdk/src/task.ts#L134)

Display name of the pinned model (e.g. "Claude Sonnet 5").

***

### use

> **use**: `string`

Defined in: [packages/agent-sdk/src/task.ts:141](https://github.com/zocomputer/zov2-code/blob/f537e0a90da222390e69bcbf7e329142b9e8d4b0/packages/agent-sdk/src/task.ts#L141)

When the parent should pick this tier over its siblings, as one complete
sentence (e.g. "Prefer it for quick, well-scoped subtasks — exploration,
focused questions, mechanical edits — where a fast, cheap model is
enough.").

***

### workspaceNoun?

> `optional` **workspaceNoun?**: `string`

Defined in: [packages/agent-sdk/src/task.ts:162](https://github.com/zocomputer/zov2-code/blob/f537e0a90da222390e69bcbf7e329142b9e8d4b0/packages/agent-sdk/src/task.ts#L162)

What the description calls the workspace. Defaults to "workspace".
