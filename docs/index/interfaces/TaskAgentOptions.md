[**@zocomputer/agent-sdk**](../../README.md)

***

[@zocomputer/agent-sdk](../../README.md) / [index](../README.md) / TaskAgentOptions

# Interface: TaskAgentOptions

Defined in: [packages/agent-sdk/src/task.ts:186](https://github.com/zocomputer/zov2-code/blob/440b57200b266cf1c7309b270db9220db760c77a/packages/agent-sdk/src/task.ts#L186)

Options for `createTaskAgent`: extends `TaskDescriptionOptions` with the
child's pinned model, optional description override, and reasoning effort.

## Extends

- [`TaskDescriptionOptions`](TaskDescriptionOptions.md)

## Properties

### build?

> `optional` **build?**: `AgentBuildDefinition`

Defined in: [packages/agent-sdk/src/task.ts:203](https://github.com/zocomputer/zov2-code/blob/440b57200b266cf1c7309b270db9220db760c77a/packages/agent-sdk/src/task.ts#L203)

Packaging controls forwarded to the child's `defineAgent`. A declared
subagent compiles with its own manifest config — the parent's
`build.externalDependencies` does not reach it — so pass the same list
(see `STDLIB_EXTERNAL_DEPENDENCIES`) to every tier.

***

### capabilityNote?

> `optional` **capabilityNote?**: `string`

Defined in: [packages/agent-sdk/src/task.ts:160](https://github.com/zocomputer/zov2-code/blob/440b57200b266cf1c7309b270db9220db760c77a/packages/agent-sdk/src/task.ts#L160)

What the child CANNOT do relative to the parent, as one complete
sentence — name the excluded tools when the consumer excludes any
(`excludedParentTools`), so the parent never delegates work the child
can't perform. Omit only when the child truly mirrors the parent's
authored toolset.

#### Inherited from

[`TaskDescriptionOptions`](TaskDescriptionOptions.md).[`capabilityNote`](TaskDescriptionOptions.md#capabilitynote)

***

### description?

> `optional` **description?**: `string`

Defined in: [packages/agent-sdk/src/task.ts:194](https://github.com/zocomputer/zov2-code/blob/440b57200b266cf1c7309b270db9220db760c77a/packages/agent-sdk/src/task.ts#L194)

Parent-facing tool description override (eve requires one on a declared
subagent). Defaults to [buildTaskDescription](../functions/buildTaskDescription.md) over the other
options.

***

### model

> **model**: `LanguageModel`

Defined in: [packages/agent-sdk/src/task.ts:188](https://github.com/zocomputer/zov2-code/blob/440b57200b266cf1c7309b270db9220db760c77a/packages/agent-sdk/src/task.ts#L188)

The child's pinned model — the tier this subagent encodes.

***

### modelBlurb?

> `optional` **modelBlurb?**: `string`

Defined in: [packages/agent-sdk/src/task.ts:152](https://github.com/zocomputer/zov2-code/blob/440b57200b266cf1c7309b270db9220db760c77a/packages/agent-sdk/src/task.ts#L152)

The model's own catalog description (from the AI Gateway model catalog —
see [fetchGatewayModelCatalog](../functions/fetchGatewayModelCatalog.md)). Checked in by the consumer, never
fetched at agent build time: tool descriptions are part of the cached
prompt prefix and must be static and offline-safe.

Explicitly `| undefined` (the exactOptionalPropertyTypes idiom): consumers
feed a `Record<string, string>` catalog lookup, which may miss — an
explicit `undefined` reads the same as omitting the blurb.

#### Inherited from

[`TaskDescriptionOptions`](TaskDescriptionOptions.md).[`modelBlurb`](TaskDescriptionOptions.md#modelblurb)

***

### modelName

> **modelName**: `string`

Defined in: [packages/agent-sdk/src/task.ts:134](https://github.com/zocomputer/zov2-code/blob/440b57200b266cf1c7309b270db9220db760c77a/packages/agent-sdk/src/task.ts#L134)

Display name of the pinned model (e.g. "Claude Sonnet 5").

#### Inherited from

[`TaskDescriptionOptions`](TaskDescriptionOptions.md).[`modelName`](TaskDescriptionOptions.md#modelname)

***

### modelOptions?

> `optional` **modelOptions?**: `AgentModelOptionsDefinition`

Defined in: [packages/agent-sdk/src/task.ts:211](https://github.com/zocomputer/zov2-code/blob/440b57200b266cf1c7309b270db9220db760c77a/packages/agent-sdk/src/task.ts#L211)

Provider option overrides forwarded to the child's model calls. Defaults
to [visibleReasoningModelOptions](../functions/visibleReasoningModelOptions.md) over the pinned model slug, so a
tier whose model hides thinking by default (Anthropic's adaptive
generation, Gemini) still streams visible reasoning. Pass explicitly to
override; the default only applies when `model` is a slug string.

***

### reasoning?

> `optional` **reasoning?**: `AgentReasoningDefinition`

Defined in: [packages/agent-sdk/src/task.ts:196](https://github.com/zocomputer/zov2-code/blob/440b57200b266cf1c7309b270db9220db760c77a/packages/agent-sdk/src/task.ts#L196)

Reasoning effort forwarded to the child's model calls.

***

### use

> **use**: `string`

Defined in: [packages/agent-sdk/src/task.ts:141](https://github.com/zocomputer/zov2-code/blob/440b57200b266cf1c7309b270db9220db760c77a/packages/agent-sdk/src/task.ts#L141)

When the parent should pick this tier over its siblings, as one complete
sentence (e.g. "Prefer it for quick, well-scoped subtasks — exploration,
focused questions, mechanical edits — where a fast, cheap model is
enough.").

#### Inherited from

[`TaskDescriptionOptions`](TaskDescriptionOptions.md).[`use`](TaskDescriptionOptions.md#use)

***

### workspaceNoun?

> `optional` **workspaceNoun?**: `string`

Defined in: [packages/agent-sdk/src/task.ts:162](https://github.com/zocomputer/zov2-code/blob/440b57200b266cf1c7309b270db9220db760c77a/packages/agent-sdk/src/task.ts#L162)

What the description calls the workspace. Defaults to "workspace".

#### Inherited from

[`TaskDescriptionOptions`](TaskDescriptionOptions.md).[`workspaceNoun`](TaskDescriptionOptions.md#workspacenoun)
