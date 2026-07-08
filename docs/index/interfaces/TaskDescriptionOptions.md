[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / TaskDescriptionOptions

# Interface: TaskDescriptionOptions

Defined in: [packages/agent-sdk/src/task.ts:207](https://github.com/zocomputer/zov2-code/blob/1e3454bf19fec73047afd6e825710b7db25d004a/packages/agent-sdk/src/task.ts#L207)

Options for `buildTaskDescription`: the pinned model's display name and
catalog blurb, when to pick this tier over its siblings, capability notes
for excluded tools, and what the description calls the workspace.

## Extended by

- [`TaskAgentOptions`](TaskAgentOptions.md)

## Properties

### capabilityNote?

> `optional` **capabilityNote?**: `string`

Defined in: [packages/agent-sdk/src/task.ts:235](https://github.com/zocomputer/zov2-code/blob/1e3454bf19fec73047afd6e825710b7db25d004a/packages/agent-sdk/src/task.ts#L235)

What the child CANNOT do relative to the parent, as one complete
sentence — name the excluded tools when the consumer excludes any
(`excludedParentTools`), so the parent never delegates work the child
can't perform. Omit only when the child truly mirrors the parent's
authored toolset.

***

### modelBlurb?

> `optional` **modelBlurb?**: `string`

Defined in: [packages/agent-sdk/src/task.ts:227](https://github.com/zocomputer/zov2-code/blob/1e3454bf19fec73047afd6e825710b7db25d004a/packages/agent-sdk/src/task.ts#L227)

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

Defined in: [packages/agent-sdk/src/task.ts:209](https://github.com/zocomputer/zov2-code/blob/1e3454bf19fec73047afd6e825710b7db25d004a/packages/agent-sdk/src/task.ts#L209)

Display name of the pinned model (e.g. "Claude Sonnet 5").

***

### use

> **use**: `string`

Defined in: [packages/agent-sdk/src/task.ts:216](https://github.com/zocomputer/zov2-code/blob/1e3454bf19fec73047afd6e825710b7db25d004a/packages/agent-sdk/src/task.ts#L216)

When the parent should pick this tier over its siblings, as one complete
sentence (e.g. "Prefer it for quick, well-scoped subtasks — exploration,
focused questions, mechanical edits — where a fast, cheap model is
enough.").

***

### workspaceNoun?

> `optional` **workspaceNoun?**: `string`

Defined in: [packages/agent-sdk/src/task.ts:237](https://github.com/zocomputer/zov2-code/blob/1e3454bf19fec73047afd6e825710b7db25d004a/packages/agent-sdk/src/task.ts#L237)

What the description calls the workspace. Defaults to "workspace".
